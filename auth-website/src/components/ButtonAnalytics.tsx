import { useEffect, useState } from 'react';
import Analytics from '../utils/analytics';

interface ButtonStats {
  [buttonName: string]: number;
}

interface ButtonAnalyticsProps {
  showRealTimeStats?: boolean;
}

export default function ButtonAnalytics({ showRealTimeStats = true }: ButtonAnalyticsProps) {
  const [buttonStats, setButtonStats] = useState<ButtonStats>({});
  const [totalClicks, setTotalClicks] = useState(0);
  const [sessionClicks, setSessionClicks] = useState(0);

  useEffect(() => {
    // Load initial stats
    updateStats();

    // Update stats every 2 seconds if showing real-time
    let interval: number;
    if (showRealTimeStats) {
      interval = setInterval(updateStats, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showRealTimeStats]);

  const updateStats = () => {
    const stats = Analytics.getButtonClickStats();
    setButtonStats(stats);

    const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
    setTotalClicks(total);

    // Get session clicks (simplified - could be enhanced with actual session tracking)
    const sessionId = sessionStorage.getItem('analytics_session_id');
    if (sessionId) {
      setSessionClicks(total); // For now, showing total as session clicks
    }
  };

  const clearStats = () => {
    // Clear button click stats
    Object.keys(buttonStats).forEach(buttonName => {
      const key = `button_clicks_${buttonName.toLowerCase().replace(/\s+/g, '_')}`;
      localStorage.removeItem(key);
    });

    // Track the clear action
    Analytics.trackEvent('analytics_cleared', {
      cleared_type: 'button_stats',
      previous_total_clicks: totalClicks,
    });

    updateStats();
  };

  const exportStats = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      totalClicks,
      sessionClicks,
      buttonStats,
      sessionId: sessionStorage.getItem('analytics_session_id'),
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `button-analytics-${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);

    Analytics.trackEvent('analytics_exported', {
      export_type: 'button_stats',
      total_clicks: totalClicks,
    });
  };

  const sortedStats = Object.entries(buttonStats).sort(([, a], [, b]) => b - a);

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e1e5e9',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}>
        <h3 style={{ margin: 0, color: '#2d3748', fontSize: '20px', fontWeight: '600' }}>
          Button Click Analytics
          {showRealTimeStats && (
            <span
              style={{
                marginLeft: '8px',
                fontSize: '12px',
                background: '#48bb78',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: '500',
              }}>
              LIVE
            </span>
          )}
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={exportStats}
            style={{
              padding: '8px 16px',
              background: '#4299e1',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}>
            Export Data
          </button>
          <button
            onClick={clearStats}
            style={{
              padding: '8px 16px',
              background: '#f56565',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}>
            Clear Stats
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}>
        <div
          style={{
            background: '#f7fafc',
            padding: '16px',
            borderRadius: '8px',
            textAlign: 'center',
          }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#2d3748' }}>{totalClicks}</div>
          <div style={{ fontSize: '14px', color: '#718096' }}>Total Clicks</div>
        </div>
        <div
          style={{
            background: '#f7fafc',
            padding: '16px',
            borderRadius: '8px',
            textAlign: 'center',
          }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#2d3748' }}>{Object.keys(buttonStats).length}</div>
          <div style={{ fontSize: '14px', color: '#718096' }}>Unique Buttons</div>
        </div>
        <div
          style={{
            background: '#f7fafc',
            padding: '16px',
            borderRadius: '8px',
            textAlign: 'center',
          }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#2d3748' }}>{sessionClicks}</div>
          <div style={{ fontSize: '14px', color: '#718096' }}>Session Clicks</div>
        </div>
      </div>

      {/* Button Performance Table */}
      {sortedStats.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
            }}>
            <thead>
              <tr style={{ background: '#f7fafc' }}>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#4a5568',
                    borderBottom: '2px solid #e2e8f0',
                  }}>
                  Button Name
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#4a5568',
                    borderBottom: '2px solid #e2e8f0',
                  }}>
                  Clicks
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#4a5568',
                    borderBottom: '2px solid #e2e8f0',
                  }}>
                  Percentage
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#4a5568',
                    borderBottom: '2px solid #e2e8f0',
                  }}>
                  Performance
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedStats.map(([buttonName, clicks], index) => {
                const percentage = totalClicks > 0 ? ((clicks / totalClicks) * 100).toFixed(1) : '0';
                const isTopPerformer = index < 3;

                return (
                  <tr
                    key={buttonName}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      background: isTopPerformer ? '#f0fff4' : 'transparent',
                    }}>
                    <td
                      style={{
                        padding: '12px',
                        fontWeight: isTopPerformer ? '600' : '400',
                        color: isTopPerformer ? '#22543d' : '#4a5568',
                      }}>
                      {buttonName}
                      {isTopPerformer && (
                        <span
                          style={{
                            marginLeft: '8px',
                            fontSize: '12px',
                            background: '#48bb78',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '10px',
                          }}>
                          TOP {index + 1}
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#2d3748',
                      }}>
                      {clicks}
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        color: '#4a5568',
                      }}>
                      {percentage}%
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div
                        style={{
                          width: '100%',
                          height: '8px',
                          background: '#e2e8f0',
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}>
                        <div
                          style={{
                            width: `${percentage}%`,
                            height: '100%',
                            background: isTopPerformer ? '#48bb78' : '#4299e1',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '40px',
            color: '#718096',
            fontSize: '16px',
          }}>
          No button clicks recorded yet. Start interacting with buttons to see analytics!
        </div>
      )}

      <div
        style={{
          marginTop: '20px',
          padding: '16px',
          background: '#edf2f7',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#4a5568',
        }}>
        <strong>Analytics Info:</strong> Data is stored locally and sent to Google Analytics. Session ID:{' '}
        {sessionStorage.getItem('analytics_session_id')?.substring(0, 20)}...
      </div>
    </div>
  );
}
