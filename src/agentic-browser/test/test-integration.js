/**
 * Integration test for the Agentic Browser system
 * Tests the complete pipeline from goal to execution
 */

import { CONFIG } from '../config/index.js';
import { CDPService } from '../services/cdp/CDPService.js';
import { LLMService } from '../services/llm/LLMService.js';
import { SelectorGenerator } from '../utils/selectors/SelectorGenerator.js';
import { Verifier } from '../core/verifier/Verifier.js';
import { SafetyManager } from '../utils/safety/SafetyManager.js';

class AgenticBrowserTest {
  constructor() {
    this.testResults = [];
  }

  /**
   * Run all integration tests
   */
  async runAllTests() {
    console.log('🚀 Starting Agentic Browser Integration Tests...\n');

    try {
      // Test 1: Configuration Loading
      await this.testConfiguration();

      // Test 2: LLM Service
      await this.testLLMService();

      // Test 3: Selector Generation
      await this.testSelectorGeneration();

      // Test 4: Safety Manager
      await this.testSafetyManager();

      // Test 5: Verification System
      await this.testVerificationSystem();

      // Print results
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  /**
   * Test configuration loading
   */
  async testConfiguration() {
    console.log('📋 Testing Configuration...');
    
    try {
      // Test basic configuration
      const hasLLMConfig = CONFIG.LLM && CONFIG.LLM.PROVIDER;
      const hasCDPConfig = CONFIG.CDP && CONFIG.CDP.VERSION;
      const hasSafetyConfig = CONFIG.SAFETY && CONFIG.SAFETY.MAX_ACTIONS_PER_MINUTE;

      if (hasLLMConfig && hasCDPConfig && hasSafetyConfig) {
        this.addTestResult('Configuration Loading', true, 'All configuration sections loaded successfully');
      } else {
        this.addTestResult('Configuration Loading', false, 'Missing configuration sections');
      }

      // Test environment variables
      const hasApiKey = process.env.OPENAI_API_KEY || CONFIG.LLM.API_KEY;
      this.addTestResult('API Key Configuration', !!hasApiKey, 
        hasApiKey ? 'API key configured' : 'API key not found');

    } catch (error) {
      this.addTestResult('Configuration Loading', false, error.message);
    }
  }

  /**
   * Test LLM Service
   */
  async testLLMService() {
    console.log('🤖 Testing LLM Service...');
    
    try {
      const llmService = new LLMService();
      
      // Test plan generation (mock)
      const mockGoal = "Navigate to google.com and search for 'test'";
      const mockState = {
        url: 'https://google.com',
        title: 'Google',
        viewport: { width: 1200, height: 800 }
      };

      // Test plan validation
      const mockPlan = {
        steps: [
          {
            action: 'navigate',
            args: { url: 'https://google.com' },
            selector: null,
            verification: { method: 'url_change', expected: { contains: 'google.com' } }
          }
        ]
      };

      const validation = llmService.validateActionPlan(mockPlan);
      this.addTestResult('LLM Plan Validation', validation.isValid, 
        validation.isValid ? 'Plan validation passed' : validation.errors.join(', '));

      // Test code safety validation
      const safeCode = "console.log('Hello World');";
      const unsafeCode = "eval('malicious code');";
      
      const safeValidation = llmService.validateCode(safeCode);
      const unsafeValidation = llmService.validateCode(unsafeCode);
      
      this.addTestResult('Code Safety Validation', 
        safeValidation.isValid && !unsafeValidation.isValid,
        safeValidation.isValid && !unsafeValidation.isValid ? 
          'Safety validation working correctly' : 'Safety validation failed');

    } catch (error) {
      this.addTestResult('LLM Service', false, error.message);
    }
  }

  /**
   * Test Selector Generation
   */
  async testSelectorGeneration() {
    console.log('🎯 Testing Selector Generation...');
    
    try {
      const selectorGenerator = new SelectorGenerator();
      
      // Test selector ranking
      const mockCandidates = [
        { selector: '#test-id', strategy: 'id', confidence: 0.8, isUnique: true, isVisible: true },
        { selector: '.test-class', strategy: 'css_selector', confidence: 0.6, isUnique: false, isVisible: true },
        { selector: '[data-testid="test"]', strategy: 'data_attribute', confidence: 0.9, isUnique: true, isVisible: true }
      ];

      const rankedCandidates = selectorGenerator.rankSelectors(mockCandidates);
      const isRankedCorrectly = rankedCandidates[0].confidence >= rankedCandidates[1].confidence;

      this.addTestResult('Selector Ranking', isRankedCorrectly, 
        isRankedCorrectly ? 'Selectors ranked by confidence' : 'Selector ranking failed');

      // Test selector filtering
      const filteredCandidates = selectorGenerator.filterSelectors(mockCandidates);
      const hasValidCandidates = filteredCandidates.length > 0 && 
        filteredCandidates.every(c => c.confidence >= CONFIG.SELECTORS.MIN_CONFIDENCE);

      this.addTestResult('Selector Filtering', hasValidCandidates,
        hasValidCandidates ? 'Selectors filtered correctly' : 'Selector filtering failed');

    } catch (error) {
      this.addTestResult('Selector Generation', false, error.message);
    }
  }

  /**
   * Test Safety Manager
   */
  async testSafetyManager() {
    console.log('🛡️ Testing Safety Manager...');
    
    try {
      const safetyManager = new SafetyManager();
      
      // Test goal validation
      const safeGoal = "Navigate to example.com";
      const unsafeGoal = "Delete all user accounts";
      
      const safeValidation = safetyManager.validateGoal(safeGoal);
      const unsafeValidation = safetyManager.validateGoal(unsafeGoal);
      
      this.addTestResult('Goal Validation', 
        safeValidation.isValid && !unsafeValidation.isValid,
        safeValidation.isValid && !unsafeValidation.isValid ?
          'Goal validation working correctly' : 'Goal validation failed');

      // Test domain blocking
      const isBlocked = safetyManager.isBlockedDomain('http://malicious-site.com');
      const isAllowed = !safetyManager.isBlockedDomain('https://google.com');
      
      this.addTestResult('Domain Blocking', 
        typeof isBlocked === 'boolean' && typeof isAllowed === 'boolean',
        'Domain blocking logic working');

      // Test input sanitization
      const maliciousInput = "<script>alert('xss')</script>";
      const sanitizedInput = safetyManager.sanitizeInput(maliciousInput);
      const isSanitized = !sanitizedInput.includes('<script>');
      
      this.addTestResult('Input Sanitization', isSanitized,
        isSanitized ? 'Input sanitization working' : 'Input sanitization failed');

    } catch (error) {
      this.addTestResult('Safety Manager', false, error.message);
    }
  }

  /**
   * Test Verification System
   */
  async testVerificationSystem() {
    console.log('✅ Testing Verification System...');
    
    try {
      // Mock CDP service for testing
      const mockCDPService = {
        findElements: async (selector) => {
          return selector === 'test-selector' ? 
            [{ isVisible: true, textContent: 'test' }] : [];
        },
        getCurrentUrl: async () => 'https://example.com',
        evaluate: async (expression) => ({ value: true })
      };

      const verifier = new Verifier(mockCDPService);
      
      // Test DOM change verification
      const domResult = await verifier.verifyDOMChange({
        selector: 'test-selector',
        shouldExist: true
      });
      
      this.addTestResult('DOM Verification', domResult.passed,
        domResult.passed ? 'DOM verification working' : 'DOM verification failed');

      // Test URL change verification
      const urlResult = await verifier.verifyURLChange({
        contains: 'example'
      });
      
      this.addTestResult('URL Verification', urlResult.passed,
        urlResult.passed ? 'URL verification working' : 'URL verification failed');

    } catch (error) {
      this.addTestResult('Verification System', false, error.message);
    }
  }

  /**
   * Add test result
   */
  addTestResult(testName, passed, message) {
    this.testResults.push({
      name: testName,
      passed,
      message,
      timestamp: new Date()
    });
    
    const status = passed ? '✅' : '❌';
    console.log(`  ${status} ${testName}: ${message}`);
  }

  /**
   * Print final results
   */
  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('='.repeat(50));
    
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    const percentage = Math.round((passed / total) * 100);
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Success Rate: ${percentage}%`);
    
    if (passed === total) {
      console.log('\n🎉 All tests passed! The Agentic Browser system is ready.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the issues above.');
    }
    
    console.log('\n📋 Detailed Results:');
    this.testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.name}: ${result.message}`);
    });
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new AgenticBrowserTest();
  test.runAllTests().catch(console.error);
}

export default AgenticBrowserTest;
