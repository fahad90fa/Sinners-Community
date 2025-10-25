import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import MFAChallenge from "@/components/MFAChallenge";
import { supabase } from "@/integrations/supabase/client";
import { getGeolocation, getDeviceInfo } from "@/utils/geolocation";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/feed");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error, mfaRequired: requiresMfa, factorId } = await signIn(email, password);
    
    if (requiresMfa && factorId) {
      setMfaRequired(true);
      setMfaFactorId(factorId);
      setLoading(false);
      return;
    }
    
    if (!error) {
      try {
        const user = await supabase.auth.getUser();
        if (user.data.user?.id) {
          const geolocation = await getGeolocation();
          const deviceInfo = getDeviceInfo();
          
          await supabase.rpc("create_login_notification", {
            p_user_id: user.data.user.id,
            p_ip_address: geolocation?.ip || "Unknown",
            p_country: geolocation?.country || "Unknown",
            p_city: geolocation?.city || "Unknown",
            p_latitude: geolocation?.latitude || 0,
            p_longitude: geolocation?.longitude || 0,
            p_device_name: deviceInfo.deviceName,
            p_browser_name: deviceInfo.browserName,
            p_os_name: deviceInfo.osName,
          });
        }
      } catch (notifError) {
        console.error("Failed to record login notification:", notifError);
      }
      
      navigate("/feed");
    }
    
    setLoading(false);
  };

  const handleMFASuccess = () => {
    setMfaRequired(false);
    setMfaFactorId(null);
    navigate("/feed");
  };

  const handleMFABack = () => {
    setMfaRequired(false);
    setMfaFactorId(null);
    setEmail("");
    setPassword("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-[hsl(355,80%,18%)] to-secondary p-4 text-white">
      {mfaRequired && mfaFactorId ? (
        <MFAChallenge 
          factorId={mfaFactorId} 
          onSuccess={handleMFASuccess}
          onBack={handleMFABack}
        />
      ) : (
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <Link to="/" className="mx-auto flex items-center gap-2">
            <Camera className="h-10 w-10 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary via-primary-glow to-[hsl(355,80%,50%)] bg-clip-text text-transparent">
              Sinners Community
            </span>
          </Link>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Log in to see photos and videos from your friends</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Enter your password"
                className="h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? "Logging in..." : "Log In"}
            </Button>
            


            <div className="text-center text-sm">
              <a href="#" className="text-primary hover:underline">Forgot password?</a>
            </div>

            <div className="text-center text-sm border-t border-border pt-4">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary font-semibold hover:underline">
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
      )}
    </div>
  );
};

export default Login;
