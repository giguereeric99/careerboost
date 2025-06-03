/**
 * ErrorState Component - FIXED JSX SYNTAX
 *
 * Displays error messages with retry functionality for the CareerBoost resume optimizer.
 * Provides user-friendly error handling with contextual information and retry mechanisms.
 * Integrates with the unified state machine for consistent error management.
 */

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Upload, FileText, Zap } from "lucide-react";
import Link from "next/link";

/**
 * Props interface for the ErrorState component
 */
interface ErrorStateProps {
	/** Main error message to display to the user */
	message: string;

	/** Whether the error is retryable and retry button should be shown */
	canRetry: boolean;

	/** Callback function to execute when user clicks retry */
	onRetry: () => void;

	/** Current step/operation that failed for context */
	currentStep: string;

	/** Optional: Type of error for different styling/icons */
	errorType?:
		| "upload"
		| "processing"
		| "analysis"
		| "save"
		| "reset"
		| "network"
		| "unknown";

	/** Optional: Additional technical details for debugging (not shown to user) */
	technicalDetails?: string;

	/** Optional: Custom retry button text */
	retryButtonText?: string;

	/** Optional: Show detailed error information */
	showDetails?: boolean;
}

/**
 * Get appropriate icon and color scheme based on error type
 */
const getErrorIcon = (errorType: ErrorStateProps["errorType"]) => {
	switch (errorType) {
		case "upload":
			return { Icon: Upload, color: "text-orange-500" };
		case "processing":
			return { Icon: FileText, color: "text-blue-500" };
		case "analysis":
			return { Icon: Zap, color: "text-purple-500" };
		case "network":
			return { Icon: RefreshCw, color: "text-green-500" };
		case "save":
		case "reset":
			return { Icon: AlertTriangle, color: "text-yellow-500" };
		default:
			return { Icon: AlertTriangle, color: "text-red-500" };
	}
};

/**
 * Get user-friendly error title based on error type
 */
const getErrorTitle = (errorType: ErrorStateProps["errorType"]) => {
	switch (errorType) {
		case "upload":
			return "Upload Failed";
		case "processing":
			return "File Processing Failed";
		case "analysis":
			return "AI Analysis Failed";
		case "save":
			return "Save Failed";
		case "reset":
			return "Reset Failed";
		case "network":
			return "Connection Issue";
		default:
			return "Something Went Wrong";
	}
};

/**
 * Get helpful suggestions based on error type
 */
const getErrorSuggestions = (
	errorType: ErrorStateProps["errorType"]
): string[] => {
	switch (errorType) {
		case "upload":
			return [
				"Check that your file is in a supported format (PDF, DOC, DOCX, TXT)",
				"Ensure your file size is under 10MB",
				"Try a different file if the issue persists",
			];
		case "processing":
			return [
				"Your file format may not be supported",
				"Try converting your file to PDF format",
				"Check that your file is not corrupted",
			];
		case "analysis":
			return [
				"Our AI service may be temporarily busy",
				"Check your internet connection",
				"Try again in a few moments",
			];
		case "network":
			return [
				"Check your internet connection",
				"Try refreshing the page",
				"Contact support if the issue continues",
			];
		case "save":
			return [
				"Check your internet connection",
				"Try saving again",
				"Your changes may have been partially saved",
			];
		case "reset":
			return [
				"Try the reset operation again",
				"Refresh the page if needed",
				"Contact support if the issue persists",
			];
		default:
			return [
				"Try refreshing the page",
				"Check your internet connection",
				"Contact support if the problem continues",
			];
	}
};

/**
 * ErrorState Component
 *
 * Displays comprehensive error information with retry functionality
 * and helpful suggestions for users to resolve issues.
 */
const ErrorState: React.FC<ErrorStateProps> = ({
	message,
	canRetry,
	onRetry,
	currentStep,
	errorType = "unknown",
	technicalDetails,
	retryButtonText = "Try Again",
	showDetails = false,
}) => {
	const { Icon, color } = getErrorIcon(errorType);
	const errorTitle = getErrorTitle(errorType);
	const suggestions = getErrorSuggestions(errorType);

	// Log technical details for debugging (not shown to user)
	React.useEffect(() => {
		if (technicalDetails && process.env.NODE_ENV === "development") {
			console.error("ErrorState Technical Details:", {
				message,
				currentStep,
				errorType,
				technicalDetails,
			});
		}
	}, [message, currentStep, errorType, technicalDetails]);

	return (
		<div className="flex items-center justify-center min-h-[400px] p-6">
			<Card className="w-full max-w-md">
				<CardContent className="p-8 text-center">
					{/* Error Icon */}
					<div className="mb-6">
						<div
							className={`mx-auto w-16 h-16 ${color} bg-gray-50 rounded-full flex items-center justify-center`}
						>
							<Icon className="w-8 h-8" />
						</div>
					</div>

					{/* Error Title */}
					<h3 className="text-xl font-semibold text-gray-900 mb-2">
						{errorTitle}
					</h3>

					{/* Error Message */}
					<p className="text-gray-600 mb-4 leading-relaxed">{message}</p>

					{/* Current Step Context */}
					{currentStep && (
						<div className="bg-gray-50 rounded-lg p-3 mb-6">
							<p className="text-sm text-gray-500">
								<span className="font-medium">Step:</span> {currentStep}
							</p>
						</div>
					)}

					{/* Helpful Suggestions */}
					{suggestions.length > 0 && (
						<div className="text-left mb-6">
							<h4 className="font-medium text-gray-900 mb-3 text-center">
								What you can try:
							</h4>
							<ul className="space-y-2">
								{suggestions.map((suggestion, index) => (
									<li
										key={index}
										className="flex items-start text-sm text-gray-600"
									>
										<span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0" />
										{suggestion}
									</li>
								))}
							</ul>
						</div>
					)}

					{/* Action Buttons */}
					<div className="flex flex-col sm:flex-row gap-3 justify-center">
						{/* Retry Button */}
						{canRetry && (
							<Button
								onClick={onRetry}
								className="flex items-center gap-2"
								size="default"
							>
								<RefreshCw className="w-4 h-4" />
								{retryButtonText}
							</Button>
						)}

						{/* Go Back Button */}
						<Button
							variant="outline"
							onClick={() => window.location.reload()}
							size="default"
						>
							Refresh Page
						</Button>
					</div>

					{/* Technical Details (Development Only) */}
					{showDetails &&
						technicalDetails &&
						process.env.NODE_ENV === "development" && (
							<details className="mt-6 text-left">
								<summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
									Technical Details (Dev Only)
								</summary>
								<div className="mt-2 p-3 bg-gray-100 rounded text-xs text-gray-600 font-mono">
									{technicalDetails}
								</div>
							</details>
						)}

					{/* Support Contact */}
					<div className="mt-6 pt-4 border-t border-gray-200">
						<p className="text-xs text-gray-500">
							Need help?{" "}
							<Link
								href="mailto:support@careerboost.com"
								className="text-blue-600 hover:text-blue-700 underline"
							>
								Contact Support
							</Link>
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default ErrorState;
