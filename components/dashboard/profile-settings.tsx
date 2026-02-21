'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, Profile } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, LogOut, Save, Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';

const AVATAR_COLORS = [
  '#059669',
  '#0284c7',
  '#7c3aed',
  '#dc2626',
  '#ea580c',
  '#ca8a04',
  '#65a30d',
  '#0891b2',
  '#4f46e5',
  '#c026d3',
];

const TUNISIA_REGIONS = [
  'Tunis',
  'Ariana',
  'Ben Arous',
  'Manouba',
  'Bizerte',
  'Nabeul',
  'Zaghouan',
  'Beja',
  'Jendouba',
  'Kef',
  'Siliana',
  'Kasserine',
  'Sidi Bouzid',
  'Sousse',
  'Monastir',
  'Mahdia',
  'Sfax',
  'Gabes',
  'Mednine',
  'Tozeur',
  'Kebili',
  'Gafsa',
  'Tataouine',
  'Kairouan',
];

export function ProfileSettings() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [region, setRegion] = useState('');
  const [avatarColor, setAvatarColor] = useState('#059669');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      setProfile(data);
      setDisplayName(data.display_name);
      setRegion(data.region);
      setAvatarColor(data.avatar_color);
      setNotificationsEnabled(data.notifications_enabled ?? true);
    }
    setLoading(false);
  };

  const saveProfile = async () => {
    if (!user) return;

    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        region: region,
        avatar_color: avatarColor,
        notifications_enabled: notificationsEnabled,
      })
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to save profile');
    } else {
      toast.success('Profile updated successfully!');
      loadProfile();
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center mb-4">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg"
              style={{ backgroundColor: avatarColor }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
            />
          </div>

          {!!profile?.username && (
            <div className="space-y-2">
              <Label>Username</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-md border bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  @{profile.username}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(profile.username || '');
                      toast.success('Username copied');
                    } catch {
                      toast.error('Failed to copy username');
                    }
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="region">Region (Tunisia)</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger>
                <SelectValue placeholder="Select your region" />
              </SelectTrigger>
              <SelectContent>
                {TUNISIA_REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Avatar Color</Label>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setAvatarColor(color)}
                  className={`w-10 h-10 rounded-full transition-transform ${
                    avatarColor === color ? 'ring-4 ring-gray-400 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {notificationsEnabled ? (
                  <Bell className="w-5 h-5 text-emerald-600" />
                ) : (
                  <BellOff className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <Label className="font-semibold">Daily Notifications</Label>
                  <p className="text-xs text-gray-500">
                    {notificationsEnabled
                      ? '1 hourly + 1 evening reminder'
                      : 'Notifications disabled'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant={notificationsEnabled ? 'default' : 'outline'}
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={notificationsEnabled ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              >
                {notificationsEnabled ? 'ON' : 'OFF'}
              </Button>
            </div>
          </div>

          <Button
            onClick={saveProfile}
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <strong>Email:</strong> {user?.email}
            </div>
            <Button
              variant="destructive"
              onClick={signOut}
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
