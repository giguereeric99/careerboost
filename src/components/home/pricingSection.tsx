import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

type PlanFeature = {
  text: string;
  included: boolean;
  pro?: boolean;
}

type SubscriptionPlanProps = {
  name: string;
  price: string;
  description: string;
  features: PlanFeature[];
  buttonText: string;
  popular?: boolean;
}

const SubscriptionPlan = ({
  name,
  price,
  description,
  features,
  buttonText,
  popular = false
}: SubscriptionPlanProps) => (
  <Card className={`relative overflow-hidden ${popular ? 'border-brand-600 shadow-lg shadow-brand-100' : ''} card-hover`}>
    {popular && (
      <div className="absolute -right-12 top-6 rotate-45 bg-gradient-to-r from-brand-600 to-teal-600 px-12 py-1 text-sm text-white">
        Popular
      </div>
    )}
    <CardHeader>
      <CardTitle className="text-xl">{name}</CardTitle>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold">{price}</span>
        {price !== 'Free' && <span className="text-sm text-muted-foreground">/month</span>}
      </div>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent className="grid gap-3">
      {features.map((feature, index) => (
        <div key={index} className={`flex items-center gap-2 ${!feature.included ? 'opacity-60' : ''}`}>
          <CheckCircle className={`h-4 w-4 ${feature.included ? (feature.pro ? 'text-teal-600' : 'text-brand-600') : 'text-muted-foreground'}`} />
          <span className="text-sm">{feature.text}</span>
        </div>
      ))}
    </CardContent>
    <CardFooter>
      <Button variant={popular ? 'default' : 'outline'} className="w-full">
        {buttonText}
      </Button>
    </CardFooter>
  </Card>
);

const SubscriptionCards = () => {
  return (
    <section id="pricing" className="py-20">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Choose Your Plan
          </h2>
          <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed">
            Get started for free or upgrade to unlock all features.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 max-w-4xl mx-auto">
          <SubscriptionPlan
            name="Basic"
            price="Free"
            description="Perfect for getting started with resume optimization."
            features={[
              { text: "AI Resume Optimization - 1 / week", included: true },
              { text: "Keyword Suggestions", included: true },
              { text: "1 Resume Template", included: true },
              { text: "Real-Time Job Search", included: false },
              { text: "Advanced Search Filters", included: false },
              { text: "5 Premium Templates", included: false },
              { text: "AI Interview Simulator", included: false },
            ]}
            buttonText="Get Started"
          />
          <SubscriptionPlan
            name="Pro"
            price="$13.99"
            description="Everything you need to boost your career prospects."
            features={[
              { text: "AI Resume Optimization", included: true, pro: true },
              { text: "Advanced Keyword Analysis", included: true, pro: true },
              { text: "5 Premium Resume Templates", included: true, pro: true },
              { text: "Real-Time Job Search", included: true, pro: true },
              { text: "Advanced Search Filters", included: true, pro: true },
              { text: "AI Interview Simulator", included: true, pro: true },
              { text: "Priority Support", included: true, pro: true },
            ]}
            buttonText="Upgrade to Pro"
            popular={true}
          />
        </div>
      </div>
    </section>
  );
};

export default SubscriptionCards;