/**
 * Resume Preview Modal Component
 *
 * A clean, modern lightbox implementation for resume preview.
 * Features:
 * - Single scrollbar design (only iframe content scrolls)
 * - Fullscreen preview with proper template application
 * - Download options for HTML and PDF
 * - Responsive layout for all screen sizes
 * - Keyboard accessibility (Escape to close)
 */
import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileText, File, X } from "lucide-react";
import { createCompleteHtml } from "@/utils/templateUtils";
import { ResumeTemplateType } from "@/types/resumeTemplateTypes";
import { toast } from "sonner";

/**
 * Props interface for the ResumePreviewModal component
 */
interface ResumePreviewModalProps {
	open: boolean; // Whether the modal is visible
	onClose: () => void; // Function to call when modal is closed
	resumeContent: string; // HTML content of the resume to preview
	selectedTemplate: ResumeTemplateType; // Template to apply to the resume
}

/**
 * ResumePreviewModal component
 *
 * Modern lightbox implementation for resume preview with only one scrollbar
 */
const ResumePreviewModal: React.FC<ResumePreviewModalProps> = ({
	open,
	onClose,
	resumeContent,
	selectedTemplate,
}) => {
	// Reference to the iframe element for content management
	const iframeRef = useRef<HTMLIFrameElement>(null);

	// State to track PDF generation process
	const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

	// State to track loading status
	const [isLoading, setIsLoading] = useState(true);

	/**
	 * Prevent scrolling of the background when modal is open
	 */
	useEffect(() => {
		if (open) {
			// Disable scrolling on the body when modal is open
			document.body.style.overflow = "hidden";
		} else {
			// Restore scrolling when modal is closed
			document.body.style.overflow = "";
		}

		// Cleanup function to ensure scrolling is restored
		return () => {
			document.body.style.overflow = "";
		};
	}, [open]);

	/**
	 * Handle iframe content loading
	 * Sets up the content in the iframe when modal is opened
	 */
	useEffect(() => {
		if (!open || !resumeContent || !selectedTemplate) return;

		// Start loading process
		setIsLoading(true);

		try {
			// Get complete HTML with template applied
			const html = createCompleteHtml(
				selectedTemplate,
				resumeContent,
				"Resume Preview"
			);

			// Reference to the iframe element
			const iframe = iframeRef.current;
			if (!iframe) return;

			// Set a timeout to ensure the iframe is ready
			setTimeout(() => {
				// Access the iframe document
				const iframeDoc =
					iframe.contentDocument || iframe.contentWindow?.document;

				if (iframeDoc) {
					// Clear the document
					iframeDoc.open();

					// Write the HTML content
					iframeDoc.write(html);

					// Close the document
					iframeDoc.close();

					// Add custom styles to ensure content fits well and is scrollable
					const style = iframeDoc.createElement("style");
					style.textContent = `
            html, body {
              padding: 20px;
              margin: 0;
              height: auto;
              background: white;
              overflow-y: auto !important;
            }
            
            /* Ensure print styles don't affect preview */
            @media print {
              body {
                padding: 20px !important;
                margin: 0 !important;
              }
            }
          `;
					iframeDoc.head.appendChild(style);

					// End loading state
					setIsLoading(false);
					toast.message("👁️ Previewing the final result of your resume!");
				}
			}, 100);
		} catch (error) {
			console.error("Error setting up preview:", error);
			toast.error("Failed to generate preview");
			setIsLoading(false);
		}
	}, [open, resumeContent, selectedTemplate]);

	/**
	 * Listen for Escape key press to close the modal
	 */
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}

			toast.message("👁️ Exiting to preview mode...");
		};

		if (open) {
			window.addEventListener("keydown", handleEscape);
		}

		return () => {
			window.removeEventListener("keydown", handleEscape);
		};
	}, [open, onClose]);

	/**
	 * Download the resume as HTML
	 */
	const handleDownloadHtml = () => {
		try {
			// Create complete HTML document with template
			const html = createCompleteHtml(
				selectedTemplate,
				resumeContent,
				"My Resume"
			);

			// Create and download the HTML file
			const blob = new Blob([html], { type: "text/html" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "resume.html";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			toast.success("Resume downloaded as HTML");
		} catch (error) {
			console.error("Error downloading HTML:", error);
			toast.error("Failed to download resume as HTML");
		}
	};

	/**
	 * Download the resume as PDF using the existing HTML preview
	 * Much simpler - uses the same HTML that's already working in the preview
	 */
	const handleDownloadPdf = async () => {
		setIsGeneratingPdf(true);

		try {
			console.log("Starting PDF generation using existing preview HTML...");

			toast.message("📄 Generating the PDF...");

			// Use the SAME HTML that's already working in the preview
			const completeHtml = createCompleteHtml(
				selectedTemplate,
				resumeContent,
				"Resume PDF"
			);

			console.log("HTML generated for PDF, length:", completeHtml.length);

			// Send the complete HTML directly to the API
			const response = await fetch("/api/generatePDF", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					completeHtml: completeHtml, // Send complete HTML instead of parts
					fileName: "resume",
				}),
			});

			console.log("PDF API response status:", response.status);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to generate PDF");
				toast.error("Something wrong happened, try again later!");
			}

			// Handle PDF download
			const blob = await response.blob();
			console.log("PDF blob received, size:", blob.size, "bytes");

			// Create and trigger download
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "resume.pdf";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			console.log("PDF download initiated successfully");
			toast.success("Resume downloaded as PDF");
		} catch (error) {
			console.error("Error generating PDF:", error);
			toast.error(`Failed to generate PDF: ${error.message}`);
		} finally {
			setIsGeneratingPdf(false);
		}
	};

	// If modal is not open, don't render anything
	if (!open) return null;

	return (
		// Backdrop with centered content - NO OVERFLOW/SCROLL here
		<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col overflow-hidden">
			{/* Modal header - fixed position */}
			<div className="w-full bg-white p-4 shadow-md z-10 flex justify-between items-center">
				<h2 className="text-lg font-semibold">
					Resume Preview - {selectedTemplate.name} Template
				</h2>

				<div className="flex gap-2">
					{/* HTML Download Button */}
					<Button
						variant="outline"
						size="sm"
						onClick={handleDownloadHtml}
						className="flex items-center gap-1"
					>
						<FileText className="h-4 w-4" />
						<span className="hidden sm:inline">HTML</span>
					</Button>

					{/* PDF Download Button */}
					<Button
						variant="outline"
						size="sm"
						onClick={handleDownloadPdf}
						disabled={isGeneratingPdf}
						className="flex items-center gap-1"
					>
						<File className="h-4 w-4" />
						<span className="hidden sm:inline">
							{isGeneratingPdf ? "Generating..." : "PDF"}
						</span>
					</Button>

					{/* Close Button */}
					<Button variant="ghost" size="sm" onClick={onClose} className="ml-2">
						<X className="h-5 w-5" />
						<span className="sr-only">Close</span>
					</Button>
				</div>
			</div>

			{/* Content area - NO OVERFLOW/SCROLL here either */}
			<div className="flex-1 bg-gray-100 flex justify-center items-start p-6 overflow-hidden">
				{/* Centered content container */}
				<div className="w-full max-w-4xl bg-white shadow-lg mx-auto relative h-full">
					{/* Loading overlay */}
					{isLoading && (
						<div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
							<div className="flex flex-col items-center">
								<div className="h-10 w-10 rounded-full border-4 border-t-transparent border-blue-500 animate-spin mb-4"></div>
								<p className="text-gray-700">Loading preview...</p>
							</div>
						</div>
					)}

					{/* Resume content iframe - THIS is the ONLY element that should scroll */}
					<iframe
						ref={iframeRef}
						className="w-full border-0 h-full"
						title="Resume Preview"
					></iframe>
				</div>
			</div>
		</div>
	);
};

export default ResumePreviewModal;
