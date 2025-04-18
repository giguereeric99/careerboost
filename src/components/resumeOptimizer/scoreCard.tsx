import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface ScoreCardProps {
  optimizationScore: number;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ optimizationScore }) => {
  return (
    <Card className="bg-gray-50 border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-600" />
          Resume Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center">
          <div className="relative w-32 h-32">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-bold">{optimizationScore}%</span>
            </div>
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e6e6e6"
                strokeWidth="10"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={optimizationScore > 80 ? "#10b981" : optimizationScore > 60 ? "#3b82f6" : "#f59e0b"}
                strokeWidth="10"
                strokeDasharray={`${optimizationScore * 2.8} ${280 - optimizationScore * 2.8}`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </svg>
          </div>
        </div>
        <p className="text-center text-sm mt-2">
          {optimizationScore > 80 
            ? "Excellent! Your resume is highly optimized." 
            : optimizationScore > 60 
              ? "Good progress. Apply more suggestions to improve further." 
              : "Your resume needs optimization to stand out."}
        </p>
      </CardContent>
    </Card>
  );
};

export default ScoreCard;