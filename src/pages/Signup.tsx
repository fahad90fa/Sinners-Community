import { useState, useEffect, useRef, ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Signup = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (user) {
      navigate("/feed");
    }
  }, [user, navigate]);

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setAvatarFile(null);
      setAvatarPreview(null);
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
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords don't match!",
        variant: "destructive",
      });
      return;
    }
    
    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await signUp(email, password, username);
      
      if (error) {
        throw error;
      }

      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        let avatarUrl = null;

        if (avatarFile) {
          const bucket = "posts";
          const fileExt = avatarFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
          const filePath = `${authUser.id}/avatar-${crypto.randomUUID()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, avatarFile, {
              cacheControl: "3600",
              upsert: true,
              contentType: avatarFile.type,
            });

          if (uploadError) {
            throw uploadError;
          }

          const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
          avatarUrl = publicUrlData.publicUrl;
        }

        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            display_name: displayName.trim() || username,
            bio: bio.trim() || null,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", authUser.id);

        if (profileError) {
          throw profileError;
        }

        navigate("/feed");
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast({
        title: "Signup failed",
        description: error instanceof Error ? error.message : "An error occurred during signup",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-[hsl(355,80%,18%)] to-secondary p-4 text-white">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <Link to="/" className="mx-auto flex items-center gap-2">
            <Camera className="h-10 w-10 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary via-primary-glow to-[hsl(355,80%,50%)] bg-clip-text text-transparent">
              Sinners Community
            </span>
          </Link>
          <CardTitle className="text-2xl">Create Your Account</CardTitle>
          <CardDescription>Sign up to see photos and videos from your friends</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Profile Picture</Label>
              <div className="flex flex-col gap-3">
                <Avatar className="h-16 w-16 mx-auto border-2 border-primary">
                  <AvatarImage src={avatarPreview ?? undefined} />
                  <AvatarFallback className="bg-primary/20">{username.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex gap-2">
                  <label className="flex-1">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </label>
                  {avatarPreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveAvatar}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                type="text" 
                placeholder="Choose a username"
                className="h-11"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input 
                id="display-name" 
                type="text" 
                placeholder="Your display name"
                className="h-11"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea 
                id="bio" 
                placeholder="Tell us about yourself"
                className="resize-none"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={150}
              />
              <p className="text-xs text-muted-foreground">{bio.length}/150</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="Enter your email"
                className="h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="Create a password"
                className="h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input 
                id="confirm-password" 
                type="password" 
                placeholder="Confirm your password"
                className="h-11"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button 
              className="w-full" 
              variant="gradient" 
              size="lg"
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Sign Up"}
            </Button>

            
            <p className="text-xs text-center text-muted-foreground">
              By signing up, you agree to our Terms, Privacy Policy and Cookies Policy.
            </p>

            <div className="text-center text-sm border-t border-border pt-4">
              Have an account?{" "}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                Log in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
