/**
 * ResetConfirmationDialog Component
 * 
 * A dialog that confirms if the user wants to reset their resume to the original AI-optimized version.
 * Used by ResumePreview to get confirmation before resetting.
 */

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ResetConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isResetting: boolean;
}

/**
 * ResetConfirmationDialog Component
 * 
 * Shows a confirmation dialog for resetting the resume to its original version
 */
const ResetConfirmationDialog: React.FC<ResetConfirmationDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  isResetting
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle>Reset Resume</AlertDialogTitle>
          <AlertDialogDescription>
            This will reset your resume to the original AI-optimized version, 
            discarding all your edits. This action cannot be undone. 
            Are you sure you want to continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            disabled={isResetting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isResetting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Resetting...
              </>
            ) : (
              'Reset Resume'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ResetConfirmationDialog;