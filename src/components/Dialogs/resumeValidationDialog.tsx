// src/components/Dialogs/resumeValidationDialog.tsx

import React from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, XCircle } from "lucide-react";

/**
 * Props for the validation dialog component
 */
interface ResumeValidationDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	validationResult: {
		isValid: boolean;
		score: number;
		missingElements: string[];
		suggestions: string[];
	} | null;
	onClose: () => void;
}

/**
 * Section name translations for display purposes
 */
const sectionNameTranslations: Record<string, string> = {
	contact: "Contact Information",
	experience: "Professional Experience",
	education: "Education",
	skills: "Skills",
	languages: "Languages",
	certifications: "Certifications",
};

/**
 * Dialog component to display resume validation results
 * Informs the user about issues detected in their resume
 */
const ResumeValidationDialog: React.FC<ResumeValidationDialogProps> = ({
	open,
	onOpenChange,
	validationResult,
	onClose,
}) => {
	if (!validationResult) return null;

	const { isValid, score, missingElements, suggestions } = validationResult;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md bg-white">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<XCircle className="h-5 w-5 text-red-500" />
						This document doesn't appear to be a resume
					</DialogTitle>
					<DialogDescription>
						The document you've uploaded doesn't seem to be a complete resume.
						Here are the issues detected:
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* Validation score */}
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">Validation score:</span>
						<div className="flex items-center gap-2">
							<div className="h-2.5 w-32 rounded-full bg-gray-200">
								<div
									className="h-2.5 rounded-full bg-red-500"
									style={{ width: `${score}%` }}
								></div>
							</div>
							<span className="text-sm font-medium">{score}%</span>
						</div>
					</div>

					{/* Missing elements */}
					{missingElements.length > 0 && (
						<div className="space-y-2">
							<h4 className="text-sm font-semibold">
								Missing or incomplete sections:
							</h4>
							<ul className="ml-5 list-disc text-sm space-y-1">
								{missingElements.map((element) => (
									<li key={element}>
										{sectionNameTranslations[element] || element}
									</li>
								))}
							</ul>
						</div>
					)}

					{/* Improvement suggestions */}
					{suggestions.length > 0 && (
						<div className="space-y-2">
							<h4 className="text-sm font-semibold">Recommendations:</h4>
							<ul className="ml-5 list-disc text-sm space-y-1">
								{suggestions.map((suggestion, index) => (
									<li key={index} className="text-gray-700">
										{suggestion}
									</li>
								))}
							</ul>
						</div>
					)}

					<div className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-700">
						<div className="flex items-center gap-2">
							<AlertCircle className="h-4 w-4" />
							<span className="font-medium">Important:</span>
						</div>
						<p className="mt-1">
							For the optimization to work properly, your document must be a
							complete resume with all essential sections. Please correct your
							resume and try again.
						</p>
					</div>
				</div>

				<DialogFooter className="sm:justify-center">
					<Button onClick={onClose}>Retry</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default ResumeValidationDialog;
