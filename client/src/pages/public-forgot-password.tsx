import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, ArrowLeft, Mail } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";

export default function PublicForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const response: any = await apiRequest('POST', '/api/public/customers/forgot-password', { email });
      setSuccess(response.message || "Se l'email è registrata, riceverai un link per reimpostare la password.");
      setEmail("");
    } catch (err: any) {
      setError(err.message || "Si è verificato un errore. Riprova più tardi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e17] flex flex-col">
      <header className="border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <img 
              src="/logo.png" 
              alt="Event4U" 
              className="h-10 w-auto cursor-pointer"
            />
          </Link>
          <Button variant="outline" asChild data-testid="button-back-login">
            <Link href="/accedi">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna al Login
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="bg-[#151922]/80 backdrop-blur-md border-white/10">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-[#FFD700]/10 rounded-full flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-[#FFD700]" />
              </div>
              <CardTitle className="text-white text-2xl">Password Dimenticata</CardTitle>
              <CardDescription className="text-gray-400">
                Inserisci la tua email per ricevere un link di reset password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive" data-testid="alert-error">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert data-testid="alert-success" className="border-green-500 bg-green-500/10">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-400">
                      {success}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tuaemail@esempio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    data-testid="input-email"
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-[#FFD700] hover:bg-[#FFD700]/90 text-black font-semibold" 
                  disabled={isLoading}
                  data-testid="button-submit"
                >
                  {isLoading ? "Invio in corso..." : "Invia Link di Reset"}
                </Button>

                <div className="text-center text-sm text-gray-400">
                  Ricordi la password?{" "}
                  <Link href="/accedi" className="text-[#FFD700] hover:underline" data-testid="link-login">
                    Accedi
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
