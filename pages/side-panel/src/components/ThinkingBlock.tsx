import { useState } from 'react';
import type { ThinkingStep } from '@extension/storage';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface ThinkingBlockProps {
  thinkingSteps: ThinkingStep[];
  isDarkMode?: boolean;
  isLive?: boolean; // Whether reasoning is actively happening
}

export default function ThinkingBlock({ thinkingSteps, isDarkMode = false, isLive = false }: ThinkingBlockProps) {
  // Always start collapsed - user can expand if they want to see steps
  // The key prop (based on taskId in parent) ensures state persists across re-renders
  const [isExpanded, setIsExpanded] = useState(false);

  if (!thinkingSteps || thinkingSteps.length === 0) {
    return null;
  }

  // Filter out non-actionable thinking (only Planner with no Navigator/Validator)
  // If there's only Planner and no actual web actions, don't show thinking block
  const hasNavigatorOrValidator = thinkingSteps.some(
    step => step.actor === 'navigator' || step.actor === 'validator'
  );
  
  // If only Planner steps exist AND task is complete (not live), hide the thinking block
  // This filters out simple conversational responses but keeps planning during live tasks
  if (!hasNavigatorOrValidator && thinkingSteps.every(step => step.actor === 'planner') && !isLive) {
    return null;
  }

  // Determine the label based on the last step's actor (if live) or show "Reasoning" if complete
  const getThinkingLabel = () => {
    if (!isLive) {
      return 'Steps';
    }
    
    const lastStep = thinkingSteps[thinkingSteps.length - 1];
    if (lastStep) {
      switch (lastStep.actor) {
        case 'planner':
          return 'Planning';
        case 'navigator':
          return 'Navigating';
        case 'validator':
          return 'Validating';
        default:
          return 'Thinking';
      }
    }
    return 'Thinking';
  };

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] ml-3">
        {/* Collapsible Header - Dynamic label based on current agent */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-1 text-left transition-opacity duration-200 ${
            isDarkMode ? 'text-gray-400 hover:opacity-100' : 'text-gray-600 hover:opacity-100'
          } ${isDarkMode ? 'opacity-60' : 'opacity-65'}`}
        >
          <span className={`text-sm ${isLive ? 'animate-glow' : ''}`}>{getThinkingLabel()}</span>
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Expanded Content - No background */}
        {isExpanded && (
          <div className="mt-2 space-y-2 pl-2">
            {thinkingSteps.map((step, index) => (
              <ThinkingStepItem
                key={`${step.timestamp}-${index}`}
                step={step}
                index={index}
                isDarkMode={isDarkMode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ThinkingStepItemProps {
  step: ThinkingStep;
  index: number;
  isDarkMode?: boolean;
}

function ThinkingStepItem({ step, index, isDarkMode = false }: ThinkingStepItemProps) {
  // Get actor label (no colors, no emojis)
  const getActorLabel = (actor: string) => {
    switch (actor) {
      case 'planner':
        return 'Planner';
      case 'navigator':
        return 'Navigator';
      case 'validator':
        return 'Validator';
      default:
        return 'System';
    }
  };

  const actorLabel = getActorLabel(step.actor);

  return (
    <div className={`${index > 0 ? 'mt-2' : ''}`}>
      <div className="flex items-start gap-2">
        <span className={`text-xs font-medium flex-shrink-0 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {actorLabel}:
        </span>
        <div className={`text-xs whitespace-pre-wrap break-words ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {step.content}
        </div>
      </div>
    </div>
  );
}
