/**
 * Template Preview Modal Component with Fixed Hover Zoom
 *
 * A modal for displaying high-quality template previews with proper zoom functionality
 * FIXED: Zoom now properly centers and shows full image
 */
import React, { useState } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface TemplatePreviewModalProps {
	isOpen: boolean;
	onClose: () => void;
	templateName: string;
	templateId: string;
}

const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
	isOpen,
	onClose,
	templateName,
	templateId,
}) => {
	const [isZoomed, setIsZoomed] = useState(false);

	if (!isOpen) return null;

	const imagePath = `/images/templates/${templateId}-preview.png`;

	const handleBackdropClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	const toggleZoom = () => {
		setIsZoomed(!isZoomed);
	};

	return (
		<div
			className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
			onClick={handleBackdropClick}
		>
			{/* Modal container - larger when zoomed */}
			<div
				className={`
				bg-white rounded-lg shadow-xl w-full max-h-[95vh] overflow-hidden transition-all duration-300
				${isZoomed ? "max-w-6xl" : "max-w-2xl"}
			`}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b bg-gray-50">
					<h3 className="font-semibold text-lg">
						{templateName} Template Preview
					</h3>
					<div className="flex items-center gap-2">
						{/* Zoom toggle button */}
						<Button
							variant="outline"
							size="sm"
							className="h-8 px-3"
							onClick={toggleZoom}
						>
							{isZoomed ? (
								<>
									<ZoomOut className="h-4 w-4 mr-1" />
									Zoom Out
								</>
							) : (
								<>
									<ZoomIn className="h-4 w-4 mr-1" />
									Zoom In
								</>
							)}
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="h-8 w-8 p-0"
							onClick={onClose}
						>
							<X className="h-4 w-4" />
							<span className="sr-only">Close</span>
						</Button>
					</div>
				</div>

				{/* FIXED: Scrollable container for zoomed content */}
				<div
					className={`
					relative transition-all duration-300
					${isZoomed ? "overflow-auto max-h-[calc(95vh-80px)]" : "overflow-hidden"}
				`}
				>
					<div className="p-6">
						{/* FIXED: Image container with proper zoom handling */}
						<div className="flex justify-center">
							<div
								className={`
									relative bg-white shadow-lg rounded-lg overflow-hidden transition-all duration-300 ease-in-out
									${isZoomed ? "cursor-zoom-out" : "cursor-zoom-in hover:shadow-xl"}
								`}
								onClick={toggleZoom}
								style={{
									width: isZoomed ? "600px" : "400px",
									aspectRatio: "8.5/11", // A4 ratio
									// FIXED: Remove scale transform, use actual size change instead
								}}
							>
								{/* Loading placeholder */}
								<div className="absolute inset-0 flex items-center justify-center bg-gray-100">
									<div className="text-center">
										<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
										<p className="text-gray-500 text-sm">Loading preview...</p>
									</div>
								</div>

								{/* FIXED: Template preview image without transform scale */}
								<Image
									src={imagePath}
									alt={`${templateName} template preview`}
									fill
									className={`
										object-contain transition-all duration-300 ease-in-out
										${!isZoomed ? "hover:scale-105" : ""}
									`}
									quality={95}
									priority
									onError={(e) => {
										console.error(
											`Failed to load template preview: ${imagePath}`
										);
										e.currentTarget.style.display = "none";
									}}
								/>

								{/* Zoom overlay hint - only show when not zoomed */}
								{!isZoomed && (
									<div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
										<div className="opacity-0 hover:opacity-100 transition-opacity duration-200 bg-white/90 backdrop-blur-sm rounded-full p-2">
											<ZoomIn className="h-5 w-5 text-gray-700" />
										</div>
									</div>
								)}
							</div>
						</div>

						{/* Description */}
						<div className="mt-6 text-center">
							<p className="text-sm text-gray-600 max-w-md mx-auto">
								{isZoomed
									? "Click the image or the Zoom Out button to return to normal size. Scroll to see the full template."
									: "Hover over the image to preview or click to zoom in for detailed view."}
							</p>
							<p className="text-xs text-gray-500 mt-2">
								This preview shows how your resume will look with the{" "}
								{templateName} template applied.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default TemplatePreviewModal;
