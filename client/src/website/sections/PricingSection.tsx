/**
 * website/sections/PricingSection.tsx — Pricing plans + social proof stats.
 */
import { Button } from "@/core/components/ui/button";
import { appUrl } from "@/shared/lib/domain";
import { Star, Check, ArrowRight } from "lucide-react";
import { AnimatedSection } from "./shared";

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-4">
            <Star className="w-4 h-4" />Simple Pricing
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Start Free. Scale as You Grow.</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">No hidden fees. No credit card required to start. Upgrade anytime.</p>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free */}
          <AnimatedSection delay={0}>
            <PlanCard
              name="Free" price="$0" period="/month" desc="Perfect for getting started"
              features={["1 platform connection", "10 AI generations/month", "Basic analytics", "Content calendar", "Email support"]}
              cta="Get Started Free" href={appUrl("/register")} variant="outline"
            />
          </AnimatedSection>

          {/* Pro */}
          <AnimatedSection delay={100}>
            <div className="relative bg-blue-600 rounded-2xl p-8 h-full flex flex-col shadow-xl shadow-blue-200">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-4 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold shadow-md">Most Popular</span>
              </div>
              <div className="mb-6">
                <div className="text-sm font-medium text-blue-200 mb-1">Pro</div>
                <div className="flex items-baseline gap-1"><span className="text-4xl font-bold text-white">$29</span><span className="text-blue-200">/month</span></div>
                <p className="text-sm text-blue-200 mt-2">For growing marketing teams</p>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {["5 platform connections", "Unlimited AI generations", "Advanced analytics", "Performance alerts", "Content calendar + scheduling", "A/B testing", "Priority support"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white"><Check className="w-4 h-4 text-blue-200 flex-shrink-0" />{f}</li>
                ))}
              </ul>
              <a href={appUrl("/register")}>
                <Button className="w-full bg-white text-blue-700 hover:bg-blue-50 font-semibold">Start Pro Trial<ArrowRight className="w-4 h-4 ml-1" /></Button>
              </a>
            </div>
          </AnimatedSection>

          {/* Enterprise */}
          <AnimatedSection delay={200}>
            <PlanCard
              name="Enterprise" price="Custom" desc="For large teams and agencies"
              features={["All 8 platforms", "Unlimited everything", "Custom dashboards", "API access", "Dedicated account manager", "SLA guarantee", "Custom integrations"]}
              cta="Contact Sales" href="mailto:sales@dashfields.com" variant="outline"
            />
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

// ─── Reusable Plan Card ───────────────────────────────────────────────────────
function PlanCard({ name, price, period, desc, features, cta, href, variant }: {
  name: string; price: string; period?: string; desc: string;
  features: string[]; cta: string; href: string; variant: "outline" | "default";
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8 h-full flex flex-col shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-6">
        <div className="text-sm font-medium text-gray-500 mb-1">{name}</div>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-gray-900">{price}</span>
          {period && <span className="text-gray-500">{period}</span>}
        </div>
        <p className="text-sm text-gray-600 mt-2">{desc}</p>
      </div>
      <ul className="space-y-3 flex-1 mb-8">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-gray-600"><Check className="w-4 h-4 text-green-500 flex-shrink-0" />{f}</li>
        ))}
      </ul>
      <a href={href}>
        <Button variant={variant} className="w-full border-gray-200 hover:border-blue-300">{cta}</Button>
      </a>
    </div>
  );
}

// ─── Social Proof Stats ───────────────────────────────────────────────────────
export function StatsSection() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "500+", label: "Active Marketers" },
            { value: "8", label: "Platforms Supported" },
            { value: "2M+", label: "Posts Scheduled" },
            { value: "99.9%", label: "Uptime SLA" },
          ].map((stat, i) => (
            <AnimatedSection key={stat.label} delay={i * 80}>
              <div>
                <div className="text-3xl sm:text-4xl font-bold text-blue-600 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
