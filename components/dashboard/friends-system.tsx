'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BellRing, Check, UserPlus, Users, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

type Friend = {
  friend_id: string;
  display_name: string;
  username: string | null;
  region: string;
  avatar_color: string;
  since: string;
};

type FriendRequest = {
  request_id: string;
  direction: 'sent' | 'received';
  status: 'pending';
  created_at: string;
  other_user_id: string;
  other_display_name: string;
  other_username: string | null;
  other_avatar_color: string;
};

type FriendNudge = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
};

type PushCapableServiceWorkerRegistration = ServiceWorkerRegistration & {
  pushManager: PushManager;
};

export function FriendsSystem() {
  const { user } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [nudges, setNudges] = useState<FriendNudge[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState('add');
  const [isNudgeDialogOpen, setIsNudgeDialogOpen] = useState(false);

  const receivedRequests = useMemo(
    () => requests.filter((request) => request.direction === 'received'),
    [requests]
  );

  const sentRequests = useMemo(
    () => requests.filter((request) => request.direction === 'sent'),
    [requests]
  );

  useEffect(() => {
    if (user) {
      loadData();
      checkPushStatus();
    }
  }, [user]);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let index = 0; index < rawData.length; ++index) {
      outputArray[index] = rawData.charCodeAt(index);
    }

    return outputArray;
  };

  const checkPushStatus = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    try {
      const registration = (await navigator.serviceWorker.getRegistration('/')) as PushCapableServiceWorkerRegistration | undefined;
      if (!registration) return;

      const subscription = await registration.pushManager.getSubscription();
      setPushEnabled(Boolean(subscription));
    } catch (error) {
      setPushEnabled(false);
    }
  };

  const enablePushNotifications = async () => {
    if (typeof window === 'undefined' || !user) return;

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      toast.error('VAPID public key is missing');
      return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error('Push is not supported on this browser');
      return;
    }

    setActionLoading('enable-push');

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Push permission not granted');
        setActionLoading(null);
        return;
      }

      const registration = (await navigator.serviceWorker.register('/sw.js')) as PushCapableServiceWorkerRegistration;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const subscriptionJson = subscription.toJSON();
      const { endpoint, keys } = subscriptionJson;

      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        toast.error('Invalid push subscription');
        setActionLoading(null);
        return;
      }

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          user_agent: navigator.userAgent,
          last_seen_at: new Date().toISOString(),
        },
        {
          onConflict: 'endpoint',
        }
      );

      if (error) {
        toast.error('Could not save push subscription');
      } else {
        setPushEnabled(true);
        toast.success('Push notifications enabled');
      }
    } catch (error) {
      toast.error('Could not enable push notifications');
    }

    setActionLoading(null);
  };

  const loadData = async () => {
    setLoading(true);

    const [friendsResult, requestsResult, nudgesResult] = await Promise.all([
      supabase.rpc('get_friends_list'),
      supabase.rpc('get_friend_requests'),
      supabase
        .from('friend_nudges')
        .select('id, from_user_id, to_user_id, message, created_at, read_at')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    if (friendsResult.error) {
      toast.error('Failed to load friends');
    } else {
      setFriends((friendsResult.data || []) as Friend[]);
    }

    if (requestsResult.error) {
      toast.error('Failed to load requests');
    } else {
      setRequests((requestsResult.data || []) as FriendRequest[]);
    }

    if (nudgesResult.error) {
      toast.error('Failed to load nudges');
    } else {
      setNudges((nudgesResult.data || []) as FriendNudge[]);
    }

    setLoading(false);
  };

  const sendRequest = async () => {
    if (!identifier.trim()) return;

    setActionLoading('send-request');
    const { data, error } = await supabase.rpc('send_friend_request', {
      p_identifier: identifier.trim(),
    });

    if (error) {
      toast.error('Unable to send request');
      setActionLoading(null);
      return;
    }

    const result = data as { ok?: boolean; error?: string; status?: string };
    if (!result?.ok) {
      toast.error(result?.error || 'Could not send request');
      setActionLoading(null);
      return;
    }

    if (result.status === 'accepted') {
      toast.success('Friend request accepted automatically');
    } else {
      toast.success('Friend request sent');
    }

    setIdentifier('');
    await loadData();
    setActionLoading(null);
  };

  const respondRequest = async (requestId: string, accept: boolean) => {
    setActionLoading(`respond-${requestId}`);

    const { data, error } = await supabase.rpc('respond_friend_request', {
      p_request_id: requestId,
      p_accept: accept,
    });

    if (error) {
      toast.error('Unable to update request');
      setActionLoading(null);
      return;
    }

    const result = data as { ok?: boolean; error?: string; status?: string };
    if (!result?.ok) {
      toast.error(result?.error || 'Request update failed');
      setActionLoading(null);
      return;
    }

    toast.success(accept ? 'Friend request accepted' : 'Friend request rejected');
    await loadData();
    setActionLoading(null);
  };

  const sendNudge = async (friendId: string) => {
    setActionLoading(`nudge-${friendId}`);
    const nudgeMessage = 'Come open Ramadan Quest and keep your streak alive 🌙';

    const { data, error } = await supabase.rpc('send_friend_nudge', {
      p_friend_id: friendId,
      p_message: nudgeMessage,
    });

    if (error) {
      toast.error('Failed to send nudge');
      setActionLoading(null);
      return;
    }

    const result = data as { ok?: boolean; error?: string };
    if (!result?.ok) {
      toast.error(result?.error || 'Failed to send nudge');
      setActionLoading(null);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (accessToken) {
      await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          toUserId: friendId,
          message: nudgeMessage,
        }),
      });
    }

    toast.success('Nudge sent');
    await loadData();
    setActionLoading(null);
  };

  const markNudgeRead = async (nudgeId: string) => {
    const { error } = await supabase
      .from('friend_nudges')
      .update({ read_at: new Date().toISOString() })
      .eq('id', nudgeId);

    if (!error) {
      setNudges((prev) => prev.map((nudge) => (nudge.id === nudgeId ? { ...nudge, read_at: new Date().toISOString() } : nudge)));
    }
  };

  if (loading) {
    return (
      <div className="text-center py-10 text-gray-500">Loading friends...</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {!pushEnabled && (
          <Button
            variant="outline"
            onClick={enablePushNotifications}
            disabled={actionLoading === 'enable-push'}
            className="flex-1"
          >
            Enable Push
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => setIsNudgeDialogOpen(true)}
          className="flex-1"
          disabled={friends.length === 0}
        >
          <BellRing className="w-4 h-4 mr-2" />
          Nudge
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto gap-1 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger value="add" className="text-xs py-2">Add</TabsTrigger>
          <TabsTrigger value="received" className="text-xs py-2">Received ({receivedRequests.length})</TabsTrigger>
          <TabsTrigger value="sent" className="text-xs py-2">Sent ({sentRequests.length})</TabsTrigger>
          <TabsTrigger value="friends" className="text-xs py-2">Friends ({friends.length})</TabsTrigger>
          <TabsTrigger value="nudges" className="text-xs py-2">Nudges</TabsTrigger>
        </TabsList>

        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Friend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="Friend username or email"
              />
              <Button
                onClick={sendRequest}
                disabled={actionLoading === 'send-request' || !identifier.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Send Request
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="received">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Received Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {receivedRequests.length === 0 ? (
                <div className="text-sm text-gray-500">No incoming requests.</div>
              ) : (
                receivedRequests.map((request) => (
                  <div key={request.request_id} className="flex items-center gap-3 p-2 rounded-lg border bg-white">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback style={{ backgroundColor: request.other_avatar_color || '#059669', color: '#fff' }}>
                        {request.other_display_name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{request.other_display_name}</div>
                      <div className="text-xs text-gray-500 truncate">@{request.other_username || 'no-username'}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => respondRequest(request.request_id, true)}
                        disabled={actionLoading === `respond-${request.request_id}`}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => respondRequest(request.request_id, false)}
                        disabled={actionLoading === `respond-${request.request_id}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sent Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sentRequests.length === 0 ? (
                <div className="text-sm text-gray-500">No sent requests.</div>
              ) : (
                sentRequests.map((request) => (
                  <div key={request.request_id} className="flex items-center gap-3 p-2 rounded-lg border bg-white">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback style={{ backgroundColor: request.other_avatar_color || '#059669', color: '#fff' }}>
                        {request.other_display_name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{request.other_display_name}</div>
                      <div className="text-xs text-gray-500 truncate">Pending</div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="friends">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Friends</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {friends.length === 0 ? (
                <div className="text-sm text-gray-500">No friends yet. Start by sending a request.</div>
              ) : (
                friends.map((friend) => (
                  <div key={friend.friend_id} className="flex items-center gap-3 p-2 rounded-lg border bg-white">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback style={{ backgroundColor: friend.avatar_color || '#059669', color: '#fff' }}>
                        {friend.display_name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{friend.display_name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        @{friend.username || 'no-username'} • {friend.region}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nudges">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Nudges
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {nudges.filter((nudge) => nudge.to_user_id === user?.id).length === 0 ? (
                <div className="text-sm text-gray-500">No nudges yet.</div>
              ) : (
                nudges
                  .filter((nudge) => nudge.to_user_id === user?.id)
                  .map((nudge) => (
                    <div key={nudge.id} className="border rounded-lg p-3 bg-white">
                      <div className="text-sm text-gray-800">{nudge.message}</div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {new Date(nudge.created_at).toLocaleString()}
                        </span>
                        {!nudge.read_at && (
                          <Button size="sm" variant="outline" onClick={() => markNudgeRead(nudge.id)}>
                            Mark as read
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isNudgeDialogOpen} onOpenChange={setIsNudgeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nudge a Friend</DialogTitle>
            <DialogDescription>Select a friend to send a reminder.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {friends.length === 0 ? (
              <div className="text-sm text-gray-500">No friends available yet.</div>
            ) : (
              friends.map((friend) => (
                <div key={friend.friend_id} className="flex items-center gap-3 p-2 rounded-lg border">
                  <Avatar className="w-9 h-9">
                    <AvatarFallback style={{ backgroundColor: friend.avatar_color || '#059669', color: '#fff' }}>
                      {friend.display_name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{friend.display_name}</div>
                    <div className="text-xs text-gray-500 truncate">@{friend.username || 'no-username'}</div>
                  </div>
                  <Button
                    size="sm"
                    onClick={async () => {
                      await sendNudge(friend.friend_id);
                      setIsNudgeDialogOpen(false);
                    }}
                    disabled={actionLoading === `nudge-${friend.friend_id}`}
                  >
                    Send
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
