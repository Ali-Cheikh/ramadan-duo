'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader, Trash2, Zap } from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  activeToday: number;
  totalDeedsCompletedToday: number;
  pendingReminders: number;
  deliveredReminders: number;
  pushSubscriptions: number;
  achievementsEarned: number;
  topUser: {
    display_name: string;
    month_total_points: number;
  } | null;
  overtueReminders: number;
  usersByStreak: {
    streak_3: number;
    streak_7: number;
    streak_14: number;
    streak_30: number;
  };
}

interface PendingReminder {
  id: string;
  user_id: string;
  reminder_type: 'hourly' | 'evening_last_chance';
  scheduled_for: string;
  notification_sent: boolean;
}

const ADMIN_SECRET_STORAGE_KEY = 'admin_secret_token';

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingReminders, setPendingReminders] = useState<PendingReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [secretInput, setSecretInput] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [actioningReminder, setActioningReminder] = useState<string | null>(null);
  const [adminSecret, setAdminSecret] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAdminSession = (reason?: string) => {
    localStorage.removeItem(ADMIN_SECRET_STORAGE_KEY);
    setAuthenticated(false);
    setAdminSecret(null);
    setPendingReminders([]);
    setStats(null);
    if (reason) {
      setAuthError(reason);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem(ADMIN_SECRET_STORAGE_KEY);
    if (stored) {
      setAdminSecret(stored);
      setAuthenticated(true);
    }
  }, []);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedSecret = secretInput.trim();
    // Validate secret is non-empty and reasonable length
    if (!normalizedSecret || normalizedSecret.length < 8) {
      alert('Invalid secret');
      return;
    }
    setAuthError(null);
    setLoading(true);
    setAdminSecret(normalizedSecret);
    setAuthenticated(true);
    localStorage.setItem(ADMIN_SECRET_STORAGE_KEY, normalizedSecret);
  };

  const fetchStats = async () => {
    if (!adminSecret) return;
    try {
      const response = await fetch('/api/admin/stats', {
        headers: { 'x-admin-secret': adminSecret },
      });
      if (response.status === 401) {
        clearAdminSession('Unauthorized. Re-enter your ADMIN_SECRET.');
        setLoading(false);
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingReminders = async () => {
    if (!adminSecret) return;
    try {
      const response = await fetch('/api/admin/reminders', {
        headers: { 'x-admin-secret': adminSecret },
      });
      if (response.status === 401) {
        clearAdminSession('Unauthorized. Re-enter your ADMIN_SECRET.');
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch reminders');
      const data = await response.json();
      setPendingReminders(data);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  };

  const triggerReminder = async (reminderId: string) => {
    if (!adminSecret) return;
    setActioningReminder(reminderId);
    try {
      const response = await fetch('/api/admin/reminders/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
        },
        body: JSON.stringify({ reminder_id: reminderId }),
      });
      if (!response.ok) throw new Error('Failed to trigger reminder');
      await fetchPendingReminders();
      await fetchStats();
    } catch (error) {
      alert('Error triggering reminder: ' + error);
    } finally {
      setActioningReminder(null);
    }
  };

  const cancelReminder = async (reminderId: string) => {
    if (!confirm('Delete this pending reminder?')) return;
    if (!adminSecret) return;
    setActioningReminder(reminderId);
    try {
      const response = await fetch('/api/admin/reminders/cancel', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
        },
        body: JSON.stringify({ reminder_id: reminderId }),
      });
      if (!response.ok) throw new Error('Failed to cancel reminder');
      await fetchPendingReminders();
      await fetchStats();
    } catch (error) {
      alert('Error canceling reminder: ' + error);
    } finally {
      setActioningReminder(null);
    }
  };

  useEffect(() => {
    if (!authenticated || !adminSecret) {
      setLoading(false);
      return;
    }
    fetchStats();
    fetchPendingReminders();
    const interval = setInterval(() => {
      fetchStats();
      fetchPendingReminders();
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [authenticated, adminSecret]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Admin Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <input
                type="password"
                placeholder="Enter admin secret"
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value)}
                autoComplete="new-password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {authError && (
                <p className="text-sm text-red-600">{authError}</p>
              )}
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-medium"
              >
                Authenticate
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white flex items-center gap-2">
          <Loader className="w-6 h-6 animate-spin" />
          Loading stats...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">Updated: {lastUpdated}</span>
            <button
              onClick={() => {
                clearAdminSession();
              }}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-slate-400 text-sm font-medium mb-2">Total Users</div>
              <div className="text-4xl font-bold text-white">{stats?.totalUsers || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-slate-400 text-sm font-medium mb-2">Active Today</div>
              <div className="text-4xl font-bold text-emerald-400">{stats?.activeToday || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-slate-400 text-sm font-medium mb-2">Deeds Completed</div>
              <div className="text-4xl font-bold text-blue-400">{stats?.totalDeedsCompletedToday || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-slate-400 text-sm font-medium mb-2">Achievements Earned</div>
              <div className="text-4xl font-bold text-amber-400">{stats?.achievementsEarned || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Reminders & Subscriptions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-300">Pending Reminders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-400">{stats?.pendingReminders || 0}</div>
              <p className="text-xs text-slate-500 mt-2">Waiting to be sent by cron</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-300">Delivered Reminders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">{stats?.deliveredReminders || 0}</div>
              <p className="text-xs text-slate-500 mt-2">Already sent via cron</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-300">Push Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400">{stats?.pushSubscriptions || 0}</div>
              <p className="text-xs text-slate-500 mt-2">Registered devices</p>
            </CardContent>
          </Card>
        </div>

        {/* Top User & Overdue Reminders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-300">🏆 Top User</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.topUser ? (
                <div>
                  <div className="text-2xl font-bold text-white">{stats.topUser.display_name}</div>
                  <div className="text-sm text-emerald-400 mt-2">
                    {stats.topUser.month_total_points} points this month
                  </div>
                </div>
              ) : (
                <div className="text-slate-400">No users yet</div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-300">⏰ Overdue Reminders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-400">{stats?.overtueReminders || 0}</div>
              <p className="text-xs text-slate-500 mt-2">Pending past scheduled time (cron check needed)</p>
            </CardContent>
          </Card>
        </div>

        {/* Badge Stats */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-300">Badge Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-400">{stats?.usersByStreak.streak_3 || 0}</div>
                <div className="text-xs text-slate-400 mt-1">🔥 3-Day Streak</div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-400">{stats?.usersByStreak.streak_7 || 0}</div>
                <div className="text-xs text-slate-400 mt-1">🎯 7-Day Streak</div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400">{stats?.usersByStreak.streak_14 || 0}</div>
                <div className="text-xs text-slate-400 mt-1">👑 2-Week Champion</div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">{stats?.usersByStreak.streak_30 || 0}</div>
                <div className="text-xs text-slate-400 mt-1">⭐ 30-Day Legend</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Reminders Table */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-300">📬 Pending Reminders ({pendingReminders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingReminders.length === 0 ? (
              <div className="text-slate-400 text-sm">No pending reminders</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2 px-2 text-slate-300 font-semibold">Type</th>
                      <th className="text-left py-2 px-2 text-slate-300 font-semibold">Scheduled For</th>
                      <th className="text-left py-2 px-2 text-slate-300 font-semibold">Time Until</th>
                      <th className="text-right py-2 px-2 text-slate-300 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingReminders.map((reminder) => {
                      const scheduledTime = new Date(reminder.scheduled_for);
                      const now = new Date();
                      const diffMs = scheduledTime.getTime() - now.getTime();
                      const diffMins = Math.floor(diffMs / 60000);
                      const isOverdue = diffMins < 0;

                      return (
                        <tr key={reminder.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                          <td className="py-3 px-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              reminder.reminder_type === 'evening_last_chance'
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'bg-blue-500/20 text-blue-300'
                            }`}>
                              {reminder.reminder_type === 'evening_last_chance' ? '🌙 Evening' : '⏰ Hourly'}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-slate-300">
                            {scheduledTime.toLocaleTimeString()}
                          </td>
                          <td className="py-3 px-2">
                            <span className={`text-xs font-medium ${
                              isOverdue ? 'text-red-400' : diffMins < 5 ? 'text-yellow-400' : 'text-slate-400'
                            }`}>
                              {isOverdue
                                ? `${Math.abs(diffMins)} min ago (OVERDUE)`
                                : `${diffMins} min`}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right space-x-2 flex justify-end">
                            <button
                              onClick={() => triggerReminder(reminder.id)}
                              disabled={actioningReminder === reminder.id}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded text-xs font-medium flex items-center gap-1"
                            >
                              {actioningReminder === reminder.id ? (
                                <Loader className="w-3 h-3 animate-spin" />
                              ) : (
                                <Zap className="w-3 h-3" />
                              )}
                              Trigger
                            </button>
                            <button
                              onClick={() => cancelReminder(reminder.id)}
                              disabled={actioningReminder === reminder.id}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded text-xs font-medium flex items-center gap-1"
                            >
                              {actioningReminder === reminder.id ? (
                                <Loader className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                              Cancel
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debug Info */}
        <div className="mt-8 text-center text-slate-500 text-sm">
          <p>This admin dashboard auto-refreshes every 30 seconds</p>
          <p className="text-xs mt-2">Trigger sends notifications immediately • Cancel deletes before cron processes</p>
        </div>
      </div>
    </div>
  );
}
