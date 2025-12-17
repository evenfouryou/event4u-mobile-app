import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Sparkles,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  Loader2,
  ChevronLeft,
  Shield,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export default function PublicLoginPage() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const redirectTo = params.get("redirect") || "/carrello";

  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    email: "",
    phone: "",
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
  });
  const [otpValue, setOtpValue] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await apiRequest("POST", "/api/public/customers/login", loginData);
      const data = await res.json();

      localStorage.setItem("customerToken", data.token);
      localStorage.setItem("customerData", JSON.stringify(data.customer));

      toast({
        title: "Benvenuto!",
        description: `Ciao ${data.customer.firstName}!`,
      });

      navigate(redirectTo);
    } catch (error: any) {
      toast({
        title: "Errore di accesso",
        description: error.message || "Credenziali non valide.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Errore",
        description: "Le password non corrispondono.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiRequest("POST", "/api/public/customers/register", {
        email: registerData.email,
        phone: registerData.phone,
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        password: registerData.password,
      });
      const data = await res.json();

      setCustomerId(data.customerId);
      setShowOTP(true);

      toast({
        title: "Registrazione avviata",
        description: "Ti abbiamo inviato un codice OTP al telefono.",
      });
    } catch (error: any) {
      toast({
        title: "Errore di registrazione",
        description: error.message || "Impossibile completare la registrazione.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpValue.length !== 6 || !customerId) return;

    setIsLoading(true);

    try {
      const res = await apiRequest("POST", "/api/public/customers/verify-otp", {
        customerId,
        otpCode: otpValue,
      });
      const data = await res.json();

      localStorage.setItem("customerToken", data.token);
      localStorage.setItem("customerData", JSON.stringify(data.customer));

      toast({
        title: "Verifica completata!",
        description: "Il tuo account è stato attivato.",
      });

      navigate(redirectTo);
    } catch (error: any) {
      toast({
        title: "Errore verifica",
        description: error.message || "Codice OTP non valido.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (showOTP) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="bg-[#151922] border-white/10">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Shield className="w-8 h-8 text-yellow-400" />
              </div>
              <CardTitle className="text-2xl text-white">Verifica OTP</CardTitle>
              <CardDescription className="text-slate-400">
                Inserisci il codice a 6 cifre inviato al tuo telefono
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={setOtpValue}
                  data-testid="input-otp"
                >
                  <InputOTPGroup>
                    {[...Array(6)].map((_, i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="border-white/20 text-white"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                onClick={handleVerifyOTP}
                disabled={otpValue.length !== 6 || isLoading}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold h-12"
                data-testid="button-verify"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Verifica
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-slate-500">
                Non hai ricevuto il codice?{" "}
                <button className="text-yellow-400 hover:underline">
                  Invia di nuovo
                </button>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e17]">
      <header className="border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/acquista">
              <Button variant="ghost" className="text-white hover:bg-white/10" data-testid="button-back">
                <ChevronLeft className="w-4 h-4 mr-1" /> Eventi
              </Button>
            </Link>
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-black" />
                </div>
                <span className="text-lg font-bold text-white">Event4U</span>
              </div>
            </Link>
            <div className="w-24" />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-[#151922] border-white/10">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full bg-white/5 border-b border-white/10 rounded-none h-14">
                <TabsTrigger
                  value="login"
                  className="flex-1 h-full text-white data-[state=active]:bg-yellow-500 data-[state=active]:text-black"
                  data-testid="tab-login"
                >
                  Accedi
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="flex-1 h-full text-white data-[state=active]:bg-yellow-500 data-[state=active]:text-black"
                  data-testid="tab-register"
                >
                  Registrati
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-0">
                <CardHeader>
                  <CardTitle className="text-xl text-white">Bentornato!</CardTitle>
                  <CardDescription className="text-slate-400">
                    Accedi al tuo account per acquistare biglietti
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-slate-400">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          type="email"
                          placeholder="mario@esempio.it"
                          value={loginData.email}
                          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                          className="pl-10 bg-white/5 border-white/10 text-white"
                          required
                          data-testid="input-login-email"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-400">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          type="password"
                          placeholder="••••••••"
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          className="pl-10 bg-white/5 border-white/10 text-white"
                          required
                          data-testid="input-login-password"
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold h-12"
                      data-testid="button-login"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Accedi
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                    
                    <div className="text-center">
                      <Link 
                        href="/public/forgot-password" 
                        className="text-sm text-yellow-400 hover:underline"
                        data-testid="link-forgot-password"
                      >
                        Password dimenticata?
                      </Link>
                    </div>
                  </form>
                </CardContent>
              </TabsContent>

              <TabsContent value="register" className="mt-0">
                <CardHeader>
                  <CardTitle className="text-xl text-white">Crea un Account</CardTitle>
                  <CardDescription className="text-slate-400">
                    Registrati per acquistare i tuoi biglietti
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-slate-400">Nome</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <Input
                            placeholder="Mario"
                            value={registerData.firstName}
                            onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                            className="pl-10 bg-white/5 border-white/10 text-white"
                            required
                            data-testid="input-firstname"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-400">Cognome</Label>
                        <Input
                          placeholder="Rossi"
                          value={registerData.lastName}
                          onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                          className="bg-white/5 border-white/10 text-white"
                          required
                          data-testid="input-lastname"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-400">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          type="email"
                          placeholder="mario@esempio.it"
                          value={registerData.email}
                          onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                          className="pl-10 bg-white/5 border-white/10 text-white"
                          required
                          data-testid="input-email"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-400">Telefono</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          type="tel"
                          placeholder="+39 333 1234567"
                          value={registerData.phone}
                          onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                          className="pl-10 bg-white/5 border-white/10 text-white"
                          required
                          data-testid="input-phone"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-400">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          type="password"
                          placeholder="Minimo 8 caratteri"
                          value={registerData.password}
                          onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                          className="pl-10 bg-white/5 border-white/10 text-white"
                          required
                          minLength={8}
                          data-testid="input-password"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-400">Conferma Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          type="password"
                          placeholder="Ripeti la password"
                          value={registerData.confirmPassword}
                          onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                          className="pl-10 bg-white/5 border-white/10 text-white"
                          required
                          data-testid="input-confirm-password"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-300">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      Riceverai un codice OTP al telefono per verificare il tuo account.
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold h-12"
                      data-testid="button-register"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Registrati
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
