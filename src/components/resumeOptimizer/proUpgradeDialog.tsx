import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, CheckCircle } from "lucide-react";

interface ProUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ProUpgradeDialog: React.FC<ProUpgradeDialogProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upgrade to Pro</DialogTitle>
          <DialogDescription>
            Access all premium resume templates and advanced AI features.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="h-5 w-5 text-amber-500" />
            <h3 className="font-medium">Pro Features Include:</h3>
          </div>
          
          <ul className="space-y-2">
            <li className="flex gap-2 items-center">
              <CheckCircle className="h-4 w-4 text-brand-600" />
              <span>5 Premium resume templates</span>
            </li>
            <li className="flex gap-2 items-center">
              <CheckCircle className="h-4 w-4 text-brand-600" />
              <span>Advanced keyword optimization</span>
            </li>
            <li className="flex gap-2 items-center">
              <CheckCircle className="h-4 w-4 text-brand-600" />
              <span>Industry-specific suggestions</span>
            </li>
            <li className="flex gap-2 items-center">
              <CheckCircle className="h-4 w-4 text-brand-600" />
              <span>Unlimited resume exports</span>
            </li>
          </ul>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Not now</Button>
          <Button>Upgrade for $19.99/month</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProUpgradeDialog;