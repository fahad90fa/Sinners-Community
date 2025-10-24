import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MFAType = any;

interface MFAChallengeProps {
  factorId: string;
  onSuccess: () => void;
  onBack: () => void;
}

const MFAChallenge = ({ factorId, onSuccess, onBack }: MFAChallengeProps) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a valid 6-digit code.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const mfa: MFAType = (supabase.auth as MFAType).mfa;
      if (!mfa) {
        throw new Error("MFA not supported.");
      }

      const { data: challengeData, error: challengeError } = await mfa.challenge({
        factorId,
      });

      if (challengeError) {
        throw challengeError;
      }

      if (!challengeData?.id) {
        throw new Error("Unable to start verification challenge.");
      }

      const { error: verifyError } = await mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: code.trim(),
      });

      if (verifyError) {
        throw verifyError;
      }

      toast({
        title: "Verified",
        description: "Two-factor authentication successful.",
      });

      setCode("");
      onSuccess();
    } catch (error) {
      console.error("Error verifying MFA", error);
      setCode("");
      toast({
        title: "Invalid code",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-4 text-center">
        <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
        <CardDescription>Enter the 6-digit code from your authenticator app</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mfa-code">Authenticator Code</Label>
            <Input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="h-11 text-center text-2xl tracking-widest"
              required
            />
          </div>

          <div className="space-y-2">
            <Button
              className="w-full"
              variant="gradient"
              size="lg"
              type="submit"
              disabled={loading || code.length !== 6}
            >
              {loading ? "Verifying..." : "Verify Code"}
            </Button>

            <Button
              className="w-full"
              variant="outline"
              size="lg"
              type="button"
              onClick={onBack}
              disabled={loading}
            >
              Back
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default MFAChallenge;
