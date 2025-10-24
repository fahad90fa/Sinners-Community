import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Grid3x3, Bookmark, UserSquare2, Settings, Camera, Zap, Play, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import StoryViewer from "@/components/StoryViewer";

interface Profile {
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_private: boolean | null;
}

const AVATAR_BUCKET = "posts";

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [bioInput, setBioInput] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [isPrivateValue, setIsPrivateValue] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isTotpEnabled, setIsTotpEnabled] = useState(false);
  const [totpFactorId, setTotpFactorId] = useState<string | null>(null);
  const [totpQrCode, setTotpQrCode] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpCodeInput, setTotpCodeInput] = useState("");
  const [isLoadingTotp, setIsLoadingTotp] = useState(false);
  const [isEnrollingTotp, setIsEnrollingTotp] = useState(false);
  const [isVerifyingTotp, setIsVerifyingTotp] = useState(false);
  const [isDisablingTotp, setIsDisablingTotp] = useState(false);
  const [stories, setStories] = useState<Array<{ id: string; url: string; type: string; caption: string | null }>>([]);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const lastPreviewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (avatarPreview && avatarPreview.startsWith("blob:")) {
      if (lastPreviewUrlRef.current && lastPreviewUrlRef.current !== avatarPreview && lastPreviewUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(lastPreviewUrlRef.current);
      }
      lastPreviewUrlRef.current = avatarPreview;
    }

    return () => {
      if (lastPreviewUrlRef.current && lastPreviewUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(lastPreviewUrlRef.current);
        lastPreviewUrlRef.current = null;
      }
    };
  }, [avatarPreview]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      void fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);
      setDisplayNameInput(profileData?.display_name ?? "");
      setBioInput(profileData?.bio ?? "");
      setIsPrivateValue(!!profileData?.is_private);
      setAvatarPreview(profileData?.avatar_url ?? null);
      setRemoveAvatar(false);

      // Fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          caption,
          created_at,
          media (
            url,
            type
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      
      // Separate stories, posts, and reels
      const storiesList: Array<{id: string; url: string; type: string; caption: string | null}> = [];
      const postsOnly: typeof postsData = [];
      const reelsList: typeof postsData = [];
      
      (postsData || []).forEach((post: any) => {
        if (post.media && post.media[0]) {
          const mediaType = post.media[0]?.type;
          if (mediaType === 'video') {
            reelsList.push(post);
            storiesList.push({
              id: post.id,
              url: post.media[0]?.url,
              type: mediaType,
              caption: post.caption,
            });
          } else {
            postsOnly.push(post);
          }
        } else {
          postsOnly.push(post);
        }
      });
      
      setStories(storiesList);
      setPosts(postsOnly);
      setReels(reelsList);

      // Fetch followers count
      const { count: followersCount, error: followersError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('followee_id', user?.id);

      if (!followersError && followersCount !== null) {
        setFollowers(followersCount);
      }

      // Fetch following count
      const { count: followingCount, error: followingError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user?.id);

      if (!followingError && followingCount !== null) {
        setFollowing(followingCount);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="text-center">
          <img src="/sinners.gif" alt="Loading" className="mx-auto h-16 w-16 rounded-full border border-primary object-cover" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setAvatarFile(null);
      setAvatarPreview(profile?.avatar_url ?? null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Unsupported file",
        description: "Please choose an image.",
        variant: "destructive",
      });
      return;
    }

    setAvatarFile(file);
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setRemoveAvatar(false);
  };

  const resetAvatarInput = () => {
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
    setAvatarFile(null);
    setAvatarPreview(profile?.avatar_url ?? null);
    setRemoveAvatar(false);
  };

  const getAvatarPath = (url?: string | null) => {
    if (!url) {
      return null;
    }
    const marker = `/object/public/${AVATAR_BUCKET}/`;
    const index = url.indexOf(marker);
    if (index === -1) {
      return null;
    }
    return url.slice(index + marker.length);
  };

  const loadTotpFactors = async () => {
    const mfa = (supabase.auth as any).mfa;
    if (!user || !mfa) {
      setIsTotpEnabled(false);
      setTotpFactorId(null);
      setTotpQrCode(null);
      setTotpSecret(null);
      setTotpCodeInput("");
      return;
    }

    try {
      setIsLoadingTotp(true);
      const { data, error } = await mfa.listFactors();
      if (error) {
        throw error;
      }
      const totpFactors = Array.isArray(data?.totp) ? data.totp.filter(Boolean) : [];
      const verified = totpFactors.find((factor: any) => factor.status === "verified");
      setIsTotpEnabled(Boolean(verified));
      setTotpFactorId(verified?.id ?? null);
      if (!verified) {
        setTotpQrCode(null);
        setTotpSecret(null);
        setTotpCodeInput("");
      }
    } catch (error) {
      console.error("Error loading MFA factors", error);
      setIsTotpEnabled(false);
      setTotpFactorId(null);
      setTotpQrCode(null);
      setTotpSecret(null);
      setTotpCodeInput("");
    } finally {
      setIsLoadingTotp(false);
    }
  };

  const handleEditDialogChange = (open: boolean) => {
    if (open) {
      setDisplayNameInput(profile?.display_name ?? "");
      setBioInput(profile?.bio ?? "");
      setAvatarFile(null);
      setAvatarPreview(profile?.avatar_url ?? null);
      setRemoveAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    } else {
      resetAvatarInput();
    }
    setIsEditOpen(open);
  };

  const handleSettingsDialogChange = async (open: boolean) => {
    if (open) {
      setIsPrivateValue(!!profile?.is_private);
      setUsernameInput(profile?.username ?? "");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTotpCodeInput("");
      await loadTotpFactors();
    }
    setIsSettingsOpen(open);
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      return;
    }

    try {
      setIsSavingProfile(true);
      let avatarUrl = profile?.avatar_url ?? null;
      const previousPath = getAvatarPath(profile?.avatar_url);

      if (removeAvatar) {
        avatarUrl = null;
        if (previousPath) {
          const { error: removeError } = await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
          if (removeError && removeError.message !== "Object not found") {
            console.warn("Unable to remove old avatar", removeError.message);
          }
        }
      } else if (avatarFile) {
        if (previousPath) {
          const { error: removeError } = await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
          if (removeError && removeError.message !== "Object not found") {
            console.warn("Unable to remove old avatar", removeError.message);
          }
        }

        const fileExt = avatarFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const filePath = `${user.id}/avatar-${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(filePath, avatarFile, {
            cacheControl: "3600",
            upsert: true,
            contentType: avatarFile.type,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);
        avatarUrl = publicUrlData.publicUrl;
        setRemoveAvatar(false);
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          display_name: displayNameInput.trim() || null,
          bio: bioInput.trim() || null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Profile updated",
        description: "Your profile information has been saved.",
      });

      await fetchProfileData();
      setIsEditOpen(false);
      resetAvatarInput();
    } catch (error) {
      console.error("Error updating profile", error);
      toast({
        title: "Unable to update",
        description: error instanceof Error ? error.message : "Profile update failed.",
        variant: "destructive",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSettingsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      return;
    }

    try {
      setIsSavingSettings(true);
      const { error } = await supabase
        .from("profiles")
        .update({
          is_private: isPrivateValue,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Settings updated",
        description: "Your preferences have been saved.",
      });

      await fetchProfileData();
      setIsSettingsOpen(false);
    } catch (error) {
      console.error("Error updating settings", error);
      toast({
        title: "Unable to update",
        description: error instanceof Error ? error.message : "Settings update failed.",
        variant: "destructive",
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {loadingData ? (
          <div className="text-center py-12">
            <img src="/sinners.gif" alt="Loading profile" className="mx-auto h-16 w-16 rounded-full border border-primary object-cover" />
            <p className="mt-4 text-muted-foreground">Loading profile...</p>
          </div>
        ) : (
          <>
            <Dialog open={isEditOpen} onOpenChange={handleEditDialogChange}>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Edit profile</DialogTitle>
                  <DialogDescription>Update your display name, bio, and profile picture.</DialogDescription>
                </DialogHeader>
                <form className="space-y-6" onSubmit={handleProfileSubmit}>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20 border-2 border-border">
                      <AvatarImage src={avatarPreview ?? undefined} />
                      <AvatarFallback>{profile?.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => avatarInputRef.current?.click()}
                        >
                          Change photo
                        </Button>
                        {avatarPreview && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setAvatarPreview(null);
                              setAvatarFile(null);
                              setRemoveAvatar(true);
                              if (avatarInputRef.current) {
                                avatarInputRef.current.value = "";
                              }
                            }}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Recommended: square JPG, PNG, or WEBP up to 5MB.</p>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarFileChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display name</Label>
                      <Input
                        id="displayName"
                        value={displayNameInput}
                        onChange={(event) => setDisplayNameInput(event.target.value)}
                        placeholder="Add your display name"
                        maxLength={60}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={bioInput}
                        onChange={(event) => setBioInput(event.target.value)}
                        placeholder="Share something about yourself"
                        rows={5}
                        maxLength={220}
                      />
                      <div className="text-xs text-muted-foreground text-right">{bioInput.length}/220</div>
                    </div>
                  </div>

                  <DialogFooter className="sm:justify-between">
                    <Button type="button" variant="ghost" onClick={() => handleEditDialogChange(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSavingProfile}>
                      {isSavingProfile ? "Saving..." : "Save changes"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isSettingsOpen} onOpenChange={handleSettingsDialogChange}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Account settings</DialogTitle>
                  <DialogDescription>Manage privacy, security, and account preferences.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 md:grid-cols-2">
                  <form className="space-y-6" onSubmit={handleSettingsSubmit}>
                    <div className="rounded-2xl border border-border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-semibold">Private account</h3>
                          <p className="text-xs text-muted-foreground">
                            Only people you approve can see your posts and followers.
                          </p>
                        </div>
                        <Switch checked={isPrivateValue} onCheckedChange={setIsPrivateValue} />
                      </div>
                    </div>

                    <DialogFooter className="sm:justify-between">
                      <Button type="button" variant="ghost" onClick={() => handleSettingsDialogChange(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSavingSettings}>
                        {isSavingSettings ? "Saving..." : "Save preferences"}
                      </Button>
                    </DialogFooter>
                  </form>

                  <div className="space-y-6">
                    <form
                      className="space-y-4 rounded-2xl border border-border p-4"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        if (!user) {
                          return;
                        }
                        if (!usernameInput.trim()) {
                          toast({
                            title: "Username required",
                            description: "Please enter a username.",
                            variant: "destructive",
                          });
                          return;
                        }
                        if (usernameInput.trim().length < 3) {
                          toast({
                            title: "Username too short",
                            description: "Username must be at least 3 characters.",
                            variant: "destructive",
                          });
                          return;
                        }
                        try {
                          setIsUpdatingUsername(true);
                          const newUsername = usernameInput.trim();
                          const { data: existing, error: lookupError } = await supabase
                            .from("profiles")
                            .select("id")
                            .eq("username", newUsername)
                            .neq("id", user.id)
                            .maybeSingle();

                          if (lookupError && lookupError.code !== "PGRST116") {
                            throw lookupError;
                          }

                          if (existing) {
                            toast({
                              title: "Username taken",
                              description: "Please choose another username.",
                              variant: "destructive",
                            });
                            return;
                          }

                          const { error: updateProfileError } = await supabase
                            .from("profiles")
                            .update({
                              username: newUsername,
                              updated_at: new Date().toISOString(),
                            })
                            .eq("id", user.id);

                          if (updateProfileError) {
                            throw updateProfileError;
                          }

                          await fetchProfileData();
                          toast({
                            title: "Username updated",
                            description: "Your username has been changed.",
                          });
                        } catch (error) {
                          console.error("Error updating username", error);
                          toast({
                            title: "Unable to update username",
                            description: error instanceof Error ? error.message : "Try again later.",
                            variant: "destructive",
                          });
                        } finally {
                          setIsUpdatingUsername(false);
                        }
                      }}
                    >
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold">Username</h3>
                        <Input
                          value={usernameInput}
                          onChange={(event) => setUsernameInput(event.target.value)}
                          placeholder="Enter new username"
                          maxLength={30}
                        />
                        <p className="text-xs text-muted-foreground">
                          Usernames are unique and help others find you.
                        </p>
                      </div>
                      <Button type="submit" size="sm" disabled={isUpdatingUsername}>
                        {isUpdatingUsername ? "Updating..." : "Update username"}
                      </Button>
                    </form>

                    <form
                      className="space-y-4 rounded-2xl border border-border p-4"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        if (!user) {
                          return;
                        }
                        if (!currentPassword || !newPassword || !confirmPassword) {
                          toast({
                            title: "Complete all fields",
                            description: "Enter current and new passwords.",
                            variant: "destructive",
                          });
                          return;
                        }
                        if (newPassword !== confirmPassword) {
                          toast({
                            title: "Passwords do not match",
                            description: "Please confirm your new password.",
                            variant: "destructive",
                          });
                          return;
                        }
                        if (newPassword.length < 8) {
                          toast({
                            title: "Password too short",
                            description: "Use at least 8 characters for your new password.",
                            variant: "destructive",
                          });
                          return;
                        }

                        try {
                          setIsUpdatingPassword(true);
                          const { error: signInError } = await supabase.auth.signInWithPassword({
                            email: user.email ?? "",
                            password: currentPassword,
                          });

                          if (signInError) {
                            throw new Error("Current password is incorrect.");
                          }

                          const { error: updateError } = await supabase.auth.updateUser({
                            password: newPassword,
                          });

                          if (updateError) {
                            throw updateError;
                          }

                          setCurrentPassword("");
                          setNewPassword("");
                          setConfirmPassword("");
                          toast({
                            title: "Password updated",
                            description: "Your password has been changed successfully.",
                          });
                        } catch (error) {
                          console.error("Error changing password", error);
                          toast({
                            title: "Unable to change password",
                            description: error instanceof Error ? error.message : "Try again later.",
                            variant: "destructive",
                          });
                        } finally {
                          setIsUpdatingPassword(false);
                        }
                      }}
                    >
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold">Change password</h3>
                        <Input
                          type="password"
                          value={currentPassword}
                          onChange={(event) => setCurrentPassword(event.target.value)}
                          placeholder="Current password"
                        />
                        <Input
                          type="password"
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          placeholder="New password"
                        />
                        <Input
                          type="password"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          placeholder="Confirm new password"
                        />
                        <p className="text-xs text-muted-foreground">
                          Choose a strong password with letters, numbers, and symbols.
                        </p>
                      </div>
                      <Button type="submit" size="sm" disabled={isUpdatingPassword}>
                        {isUpdatingPassword ? "Updating..." : "Update password"}
                      </Button>
                    </form>

                    <div className="space-y-4 rounded-2xl border border-border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-semibold">Two-factor authentication</h3>
                          <p className="text-xs text-muted-foreground">
                            Protect your account with a Google Authenticator code.
                          </p>
                        </div>
                        <Badge variant={isTotpEnabled ? "default" : "secondary"}>
                          {isTotpEnabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>

                      {isTotpEnabled ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isDisablingTotp}
                          onClick={async () => {
                            if (!totpFactorId) {
                              return;
                            }
                            try {
                              setIsDisablingTotp(true);
                              const mfa = (supabase.auth as any).mfa;
                              if (!mfa) {
                                throw new Error("MFA not supported.");
                              }
                              await mfa.deleteFactor({ factorId: totpFactorId });
                              toast({
                                title: "Two-factor disabled",
                                description: "You can enable it again anytime.",
                              });
                              setTotpCodeInput("");
                              setTotpQrCode(null);
                              setTotpSecret(null);
                              setTotpFactorId(null);
                              await loadTotpFactors();
                            } catch (error) {
                              console.error("Error disabling TOTP", error);
                              toast({
                                title: "Unable to disable two-factor",
                                description: error instanceof Error ? error.message : "Try again later.",
                                variant: "destructive",
                              });
                            } finally {
                              setIsDisablingTotp(false);
                            }
                          }}
                        >
                          Disable two-factor
                        </Button>
                      ) : (
                        <div className="space-y-4">
                          {totpQrCode ? (
                            <div className="space-y-3 text-center">
                              <img src={totpQrCode} alt="Authenticator QR" className="mx-auto h-32 w-32" />
                              <p className="text-xs text-muted-foreground break-words">
                                Secret: {totpSecret}
                              </p>
                              <div className="space-y-2">
                                <Input
                                  value={totpCodeInput}
                                  onChange={(event) => setTotpCodeInput(event.target.value.replace(/\D/g, ""))}
                                  placeholder="Enter 6-digit code"
                                  maxLength={6}
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                />
                                <Button
                                  size="sm"
                                  disabled={isVerifyingTotp || totpCodeInput.length !== 6}
                                  onClick={async () => {
                                    const mfa = (supabase.auth as any).mfa;
                                    if (!mfa || !totpFactorId) {
                                      return;
                                    }
                                    try {
                                      setIsVerifyingTotp(true);
                                      const trimmedCode = totpCodeInput.trim();
                                      const { data: challengeData, error: challengeError } = await mfa.challenge({
                                        factorId: totpFactorId,
                                      });
                                      if (challengeError) {
                                        throw challengeError;
                                      }
                                      if (!challengeData?.id) {
                                        throw new Error("Unable to start verification challenge.");
                                      }

                                      const { error: verifyError } = await mfa.verify({
                                        factorId: totpFactorId,
                                        challengeId: challengeData.id,
                                        code: trimmedCode,
                                      });

                                      if (verifyError) {
                                        throw verifyError;
                                      }

                                      toast({
                                        title: "Two-factor enabled",
                                        description: "Authenticator codes will be required when you log in.",
                                      });
                                      setTotpCodeInput("");
                                      setTotpQrCode(null);
                                      setTotpSecret(null);
                                      await loadTotpFactors();
                                    } catch (error) {
                                      console.error("Error verifying TOTP", error);
                                      setTotpCodeInput("");
                                      toast({
                                        title: "Invalid code",
                                        description: error instanceof Error ? error.message : "Please try again.",
                                        variant: "destructive",
                                      });
                                    } finally {
                                      setIsVerifyingTotp(false);
                                    }
                                  }}
                                >
                                  {isVerifyingTotp ? "Verifying..." : "Verify code"}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              disabled={isEnrollingTotp}
                              onClick={async () => {
                                try {
                                  setIsEnrollingTotp(true);
                                  const mfa = (supabase.auth as any).mfa;
                                  if (!mfa) {
                                    throw new Error("MFA not supported.");
                                  }
                                  const { data, error } = await mfa.enroll({
                                    factorType: "totp",
                                    friendlyName: "Authenticator app",
                                  });
                                  if (error) {
                                    throw error;
                                  }
                                  if (!data?.id) {
                                    throw new Error("Unable to register authenticator factor.");
                                  }
                                  const qrCode = data?.totp?.qr_code ?? null;
                                  if (!qrCode) {
                                    throw new Error("Unable to generate QR code.");
                                  }
                                  const secret = data?.totp?.secret ?? null;
                                  setTotpFactorId(data.id);
                                  setTotpQrCode(qrCode);
                                  setTotpSecret(secret);
                                  setTotpCodeInput("");
                                  toast({
                                    title: "Scan the QR code",
                                    description: "Use Google Authenticator to finish setup.",
                                  });
                                } catch (error) {
                                  console.error("Error enrolling TOTP", error);
                                  toast({
                                    title: "Unable to enable two-factor",
                                    description: error instanceof Error ? error.message : "Try again later.",
                                    variant: "destructive",
                                  });
                                } finally {
                                  setIsEnrollingTotp(false);
                                }
                              }}
                            >
                              Enable two-factor
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Profile Header */}
            <div className="flex flex-col md:flex-row gap-8 md:gap-16 mb-12">
              <div className="relative flex justify-center md:justify-start">
                <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-border">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-3xl">
                    {profile?.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute bottom-2 right-2 rounded-full"
                  onClick={() => handleEditDialogChange(true)}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex-1 space-y-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  <h1 className="text-2xl font-semibold">{profile?.username || 'User'}</h1>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => handleEditDialogChange(true)}>Edit Profile</Button>
                    <Button variant="secondary" size="icon" onClick={() => navigate('/creator-dashboard')} title="Creator Dashboard">
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="icon" onClick={() => handleSettingsDialogChange(true)}>
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-8 text-center md:text-left">
                  <div>
                    <div className="font-semibold text-lg">{posts.length}</div>
                    <div className="text-sm text-muted-foreground">posts</div>
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{followers}</div>
                    <div className="text-sm text-muted-foreground">followers</div>
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{following}</div>
                    <div className="text-sm text-muted-foreground">following</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-semibold text-lg">{profile?.display_name || profile?.username}</div>
                  <div className="text-sm text-muted-foreground">@{profile?.username}</div>
                  {profile?.bio ? (
                    <div className="text-sm whitespace-pre-wrap">{profile.bio}</div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Add a bio to tell others about yourself.</div>
                  )}
                </div>
              </div>
            </div>

            {stories.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Stories</h2>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {stories.map((story, index) => (
                    <button
                      key={story.id}
                      onClick={() => {
                        setSelectedStoryIndex(index);
                        setStoryViewerOpen(true);
                      }}
                      className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-muted hover:opacity-80 transition-opacity relative border-2 border-primary/20 hover:border-primary"
                    >
                      {story.type === 'video' ? (
                        <>
                          <video
                            src={story.url}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Zap className="h-5 w-5 text-white" />
                          </div>
                        </>
                      ) : (
                        <img
                          src={story.url}
                          alt="Story"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="posts" className="w-full">
              <TabsList className="w-full justify-center border-t border-border">
                <TabsTrigger value="posts" className="flex items-center gap-2">
                  <Grid3x3 className="h-4 w-4" />
                  <span className="hidden md:inline">Posts</span>
                </TabsTrigger>
                <TabsTrigger value="reels" className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  <span className="hidden md:inline">Reels</span>
                </TabsTrigger>
                <TabsTrigger value="saved" className="flex items-center gap-2">
                  <Bookmark className="h-4 w-4" />
                  <span className="hidden md:inline">Saved</span>
                </TabsTrigger>
                <TabsTrigger value="tagged" className="flex items-center gap-2">
                  <UserSquare2 className="h-4 w-4" />
                  <span className="hidden md:inline">Tagged</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="posts" className="mt-6">
                {posts.length === 0 ? (
                  <div className="text-center py-16">
                    <Grid3x3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
                    <p className="text-muted-foreground">Start sharing your moments!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1 md:gap-4">
                    {posts.map((post) => (
                      <div 
                        key={post.id} 
                        className="aspect-square bg-muted rounded-sm overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <img 
                          src={post.media[0]?.url || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop'} 
                          alt={post.caption || 'Post'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="reels" className="mt-6">
                {reels.length === 0 ? (
                  <div className="text-center py-16">
                    <Play className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No reels yet</h3>
                    <p className="text-muted-foreground">Share your first video reel!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1 md:gap-4">
                    {reels.map((reel) => (
                      <div 
                        key={reel.id} 
                        className="aspect-square bg-muted rounded-sm overflow-hidden cursor-pointer hover:opacity-80 transition-opacity relative group"
                      >
                        <video 
                          src={reel.media[0]?.url} 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                          <Play className="h-8 w-8 text-white" fill="white" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="saved" className="mt-6">
                <div className="text-center py-16">
                  <Bookmark className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No saved posts yet</h3>
                  <p className="text-muted-foreground">Save posts to see them here</p>
                </div>
              </TabsContent>

              <TabsContent value="tagged" className="mt-6">
                <div className="text-center py-16">
                  <UserSquare2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No tagged posts yet</h3>
                  <p className="text-muted-foreground">Posts you're tagged in will appear here</p>
                </div>
              </TabsContent>
            </Tabs>

            <StoryViewer
              stories={stories.map(s => ({
                id: s.id,
                url: s.url,
                type: s.type as "image" | "video",
                caption: s.caption || "",
              }))}
              initialIndex={selectedStoryIndex}
              open={storyViewerOpen}
              onOpenChange={setStoryViewerOpen}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default Profile;
