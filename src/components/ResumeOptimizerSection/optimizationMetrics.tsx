import React from 'react';
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OptimizationMetricsProps {
  metrics: any;
  onExport: (format: string) => void;
  onDownload: () => void;
}

const OptimizationMetrics: React.FC<OptimizationMetricsProps> = ({ 
  metrics, 
  onExport, 
  onDownload 
}) => {
  if (!metrics) return null;
  
  return (
    <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Download className="h-4 w-4 text-gray-600" />
        <h3 className="font-medium text-sm">Export Options</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onExport('markdown')}
          className="w-full"
        >
          <FileText className="h-3 w-3 mr-1" />
          Export Report
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onDownload}
          className="w-full"
        >
          <Download className="h-3 w-3 mr-1" />
          Download HTML
        </Button>
      </div>
      
      {/* Optimization Stats */}
      <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>Initial Score:</span>
          <span className="font-medium">{metrics.initialScore}</span>
        </div>
        <div className="flex justify-between">
          <span>Current Score:</span>
          <span className="font-medium">{metrics.finalScore}</span>
        </div>
        {metrics.improvement > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Improvement:</span>
            <span className="font-medium">+{metrics.improvement} points</span>
          </div>
        )}
        <div className="flex justify-between mt-1">
          <span>Applied Suggestions:</span>
          <span className="font-medium">{metrics.appliedSuggestionCount}</span>
        </div>
        <div className="flex justify-between">
          <span>Applied Keywords:</span>
          <span className="font-medium">{metrics.appliedKeywordCount}</span>
        </div>
      </div>
    </div>
  );
};

export default OptimizationMetrics;