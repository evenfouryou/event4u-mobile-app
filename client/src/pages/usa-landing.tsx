import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, Check, Loader2, Instagram, Phone, Mail, Building2, Users } from "lucide-react";

interface LandingPageData {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  heroText: string | null;
  accentColor: string;
  venueSpots: number;
  promoterSpots: number;
  targetCity: string;
  painPoints: Array<{ title: string; description: string }> | null;
  valueProps: Array<{ title: string; description: string }> | null;
  faqs: Array<{ question: string; answer: string }> | null;
}

export default function UsaLanding() {
  const { toast } = useToast();
  const [role, setRole] = useState<"venue" | "promoter">("venue");
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    instagram: "",
    phoneOrEmail: "",
    venueName: "",
    venueRole: "",
    avgTables: "",
    avgGuests: "",
    city: "Miami",
    note: "",
  });

  const { data: pageData, isLoading } = useQuery<LandingPageData>({
    queryKey: ["/api/landing/usa"],
  });

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/landing/usa/leads", data);
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Application Submitted",
        description: "We'll review your application and get back to you soon.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit application",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate({
      role,
      ...formData,
    });
  };

  const painPoints = pageData?.painPoints || [
    { title: "Guestlists aren't tracked", description: "you can't prove performance." },
    { title: "Tables cancel last minute", description: "no deposits, no penalties, no control." },
    { title: "Promoters get paid \"by feel\"", description: "no leverage, no real accountability." },
  ];

  const valueProps = pageData?.valueProps || [
    { title: "Venue Control", description: "Deposits secured, table inventory, live revenue view, promoter performance." },
    { title: "Promoter Proof", description: "Scanned guest verification, real stats, real leverage for commissions." },
    { title: "Real-Time Ops", description: "Fast check-in flow, clean dashboards, end-of-night report in minutes." },
  ];

  const faqs = pageData?.faqs || [
    { question: "Is the product live?", answer: "Not publicly. This is a Miami pilot. We onboard a small group first." },
    { question: "How much does it cost?", answer: "Pilot partners get preferred pricing. Details after approval." },
    { question: "Is this a marketplace?", answer: "No. It's an operating system: control + tracking + deposits + performance." },
  ];

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#070a0f] text-[#eaf0f7] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#77f2b4]/20 flex items-center justify-center">
            <Check className="w-10 h-10 text-[#77f2b4]" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Application Received</h1>
          <p className="text-[#9bb0c6] mb-8">
            We'll review your application and reach out if you're a fit. 
            In the meantime, follow us on Instagram for updates.
          </p>
          <a 
            href="https://instagram.com/event4u" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#77f2b4] text-[#070a0f] font-semibold rounded-lg hover:bg-[#5ed9a0] transition-colors"
            data-testid="link-instagram"
          >
            <Instagram className="w-5 h-5" />
            Follow @event4u
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070a0f] text-[#eaf0f7] relative overflow-hidden">
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(900px 500px at 20% 10%, rgba(119,242,180,0.08), transparent 60%),
            radial-gradient(700px 400px at 85% 30%, rgba(255,77,109,0.10), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,0.03), transparent 50%)
          `
        }}
      />
      
      <div className="relative max-w-[980px] mx-auto px-4 sm:px-6 py-6">
        <header className="flex justify-between items-center mb-8">
          <div className="text-xs font-bold tracking-[0.14em] text-[#9bb0c6]">
            MIAMI NIGHTLIFE SYSTEM
          </div>
          <a href="#apply" className="text-xs text-[#9bb0c6] hover:text-[#77f2b4] transition-colors" data-testid="link-apply">
            Pilot Access
          </a>
        </header>

        <section className="py-12 md:py-20">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-6">
            {pageData?.heroText || (
              <>The door runs on chaos.<br/>We run it on numbers.</>
            )}
          </h1>
          <p className="text-lg text-[#9bb0c6] max-w-2xl mb-8">
            {pageData?.subtitle || "Tables, tickets, promoters — tracked in real time. If you don't control the numbers, you don't control the deal."}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <Button 
              onClick={() => {
                setRole("venue");
                document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-6 py-3 h-auto bg-[#77f2b4] text-[#070a0f] font-semibold hover:bg-[#5ed9a0]"
              data-testid="button-apply-venue"
            >
              <Building2 className="w-4 h-4 mr-2" />
              Apply as Venue
            </Button>
            <Button 
              onClick={() => {
                setRole("promoter");
                document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" });
              }}
              variant="outline"
              className="px-6 py-3 h-auto border-[#182233] text-[#eaf0f7] hover:bg-[#0c121b]"
              data-testid="button-apply-promoter"
            >
              <Users className="w-4 h-4 mr-2" />
              Apply as Promoter
            </Button>
          </div>

          <div className="flex flex-wrap gap-3">
            <span className="px-3 py-1.5 text-xs bg-[#0c121b] border border-[#182233] rounded-full text-[#9bb0c6]">
              No launch dates. Pilot only.
            </span>
            <span className="px-3 py-1.5 text-xs bg-[#0c121b] border border-[#182233] rounded-full text-[#9bb0c6]">
              Limited spots: {pageData?.venueSpots || 2} venues • {pageData?.promoterSpots || 10} promoters
            </span>
            <span className="px-3 py-1.5 text-xs bg-[#0c121b] border border-[#182233] rounded-full text-[#9bb0c6]">
              {pageData?.targetCity || "Miami"}-first. Not a generic ticket app.
            </span>
          </div>
        </section>

        <section className="py-12 border-t border-[#182233]">
          <h2 className="text-2xl font-bold mb-6">What's costing you money — every weekend</h2>
          <ul className="space-y-4">
            {painPoints.map((point, index) => (
              <li key={index} className="flex gap-3 text-[#9bb0c6]">
                <span className="text-[#ff4d6d]">•</span>
                <span><strong className="text-[#eaf0f7]">{point.title}</strong> → {point.description}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="py-12 border-t border-[#182233]">
          <h2 className="text-2xl font-bold mb-8">What the pilot gives you</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {valueProps.map((prop, index) => (
              <div key={index} className="p-6 bg-[#0c121b] border border-[#182233] rounded-lg">
                <h3 className="text-lg font-semibold text-[#77f2b4] mb-3">{prop.title}</h3>
                <p className="text-sm text-[#9bb0c6]">{prop.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="apply" className="py-12 border-t border-[#182233]">
          <h2 className="text-2xl font-bold mb-2">Request pilot access</h2>
          <p className="text-[#9bb0c6] mb-8">
            We're selecting a small group. If you're serious, apply.
          </p>

          <div className="flex mb-6">
            <button
              type="button"
              onClick={() => setRole("venue")}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                role === "venue" 
                  ? "bg-[#77f2b4] text-[#070a0f]" 
                  : "bg-[#0c121b] text-[#9bb0c6] hover:text-[#eaf0f7]"
              } ${role === "venue" ? "rounded-l-lg" : "rounded-l-lg border border-[#182233]"}`}
              data-testid="button-role-venue"
            >
              Venue
            </button>
            <button
              type="button"
              onClick={() => setRole("promoter")}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                role === "promoter" 
                  ? "bg-[#77f2b4] text-[#070a0f]" 
                  : "bg-[#0c121b] text-[#9bb0c6] hover:text-[#eaf0f7]"
              } ${role === "promoter" ? "rounded-r-lg" : "rounded-r-lg border border-[#182233]"}`}
              data-testid="button-role-promoter"
            >
              Promoter
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#9bb0c6] mb-1.5">Full name</label>
              <Input
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="John Smith"
                required
                className="bg-[#0c121b] border-[#182233] text-[#eaf0f7] placeholder:text-[#4a5568]"
                data-testid="input-full-name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#9bb0c6] mb-1.5">Instagram</label>
              <Input
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                placeholder="@yourhandle"
                required
                className="bg-[#0c121b] border-[#182233] text-[#eaf0f7] placeholder:text-[#4a5568]"
                data-testid="input-instagram"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#9bb0c6] mb-1.5">Phone or Email</label>
              <Input
                value={formData.phoneOrEmail}
                onChange={(e) => setFormData({ ...formData, phoneOrEmail: e.target.value })}
                placeholder="+1 ... / email@..."
                required
                className="bg-[#0c121b] border-[#182233] text-[#eaf0f7] placeholder:text-[#4a5568]"
                data-testid="input-phone-email"
              />
            </div>

            {role === "venue" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[#9bb0c6] mb-1.5">Venue name</label>
                  <Input
                    value={formData.venueName}
                    onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                    placeholder="Club / Rooftop / Hotel venue"
                    className="bg-[#0c121b] border-[#182233] text-[#eaf0f7] placeholder:text-[#4a5568]"
                    data-testid="input-venue-name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#9bb0c6] mb-1.5">Your role</label>
                  <select
                    value={formData.venueRole}
                    onChange={(e) => setFormData({ ...formData, venueRole: e.target.value })}
                    className="w-full h-10 px-3 bg-[#0c121b] border border-[#182233] rounded-md text-[#eaf0f7]"
                    data-testid="select-venue-role"
                  >
                    <option value="">Select</option>
                    <option value="Owner">Owner</option>
                    <option value="Manager">Manager</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#9bb0c6] mb-1.5">Avg VIP tables per weekend</label>
                  <select
                    value={formData.avgTables}
                    onChange={(e) => setFormData({ ...formData, avgTables: e.target.value })}
                    className="w-full h-10 px-3 bg-[#0c121b] border border-[#182233] rounded-md text-[#eaf0f7]"
                    data-testid="select-avg-tables"
                  >
                    <option value="">Select</option>
                    <option value="0–5">0–5</option>
                    <option value="5–15">5–15</option>
                    <option value="15+">15+</option>
                  </select>
                </div>
              </>
            )}

            {role === "promoter" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[#9bb0c6] mb-1.5">Avg guests per weekend</label>
                  <select
                    value={formData.avgGuests}
                    onChange={(e) => setFormData({ ...formData, avgGuests: e.target.value })}
                    className="w-full h-10 px-3 bg-[#0c121b] border border-[#182233] rounded-md text-[#eaf0f7]"
                    data-testid="select-avg-guests"
                  >
                    <option value="">Select</option>
                    <option value="0–20">0–20</option>
                    <option value="20–50">20–50</option>
                    <option value="50+">50+</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#9bb0c6] mb-1.5">City</label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Miami"
                    className="bg-[#0c121b] border-[#182233] text-[#eaf0f7] placeholder:text-[#4a5568]"
                    data-testid="input-city"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-[#9bb0c6] mb-1.5">Note (optional)</label>
              <Textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="What venue? What nights? What are you trying to fix?"
                className="bg-[#0c121b] border-[#182233] text-[#eaf0f7] placeholder:text-[#4a5568] resize-none"
                rows={3}
                data-testid="textarea-note"
              />
            </div>

            <Button 
              type="submit" 
              disabled={submitMutation.isPending}
              className="w-full py-3 h-auto bg-[#77f2b4] text-[#070a0f] font-semibold hover:bg-[#5ed9a0]"
              data-testid="button-submit"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Request Access"
              )}
            </Button>

            <p className="text-xs text-center text-[#4a5568]">
              No spam. If approved, you'll get a short fit-call link.
            </p>
          </form>
        </section>

        <section className="py-12 border-t border-[#182233]">
          <h2 className="text-2xl font-bold mb-6">FAQ</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details key={index} className="group">
                <summary className="flex justify-between items-center cursor-pointer py-3 text-[#eaf0f7] font-medium list-none">
                  {faq.question}
                  <ChevronDown className="w-5 h-5 text-[#9bb0c6] group-open:rotate-180 transition-transform" />
                </summary>
                <p className="pb-4 text-[#9bb0c6]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <footer className="py-8 border-t border-[#182233] flex justify-between items-center text-xs text-[#4a5568]">
          <div>© Miami Nightlife System</div>
          <div>Pilot Access • Limited Spots</div>
        </footer>
      </div>
    </div>
  );
}
