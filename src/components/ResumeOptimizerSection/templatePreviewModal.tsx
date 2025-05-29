/**
 * Template Preview Modal Component
 *
 * A simple modal for displaying high-quality template previews
 * Opens when the user clicks the eye icon in the template gallery
 */
import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface TemplatePreviewModalProps {
	isOpen: boolean;
	onClose: () => void;
	templateName: string;
	templateId: string;
}

/**
 * Template Preview Modal
 *
 * Displays a larger preview image of the selected template in a modal
 */
const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
	isOpen,
	onClose,
	templateName,
	templateId,
}) => {
	// Don't render anything if modal is not open
	if (!isOpen) return null;

	// Construct the image path based on templateId
	const imagePath = `/images/templates/${templateId}-preview.png`;

	// Handle backdrop click to close modal
	const handleBackdropClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	return (
		<div
			className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
			onClick={handleBackdropClick}
		>
			<div className="bg-white rounded-lg shadow-lg max-w-md w-full overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b">
					<h3 className="font-medium">{templateName} Template Preview</h3>
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

				{/* Content */}
				<div className="p-4">
					<div className="relative aspect-[8.5/11] w-full">
						{/* Fallback message if image can't load */}
						<div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-md">
							<p className="text-gray-500 text-sm">Loading preview...</p>
						</div>

						{/* Template preview image */}
						<Image
							src={imagePath}
							alt={`${templateName} template preview`}
							fill
							className="object-contain rounded-md"
							onError={(e) => {
								// Display fallback message if image fails to load
								console.error(`Failed to load template preview: ${imagePath}`);
								e.currentTarget.style.display = "none";
							}}
						/>
					</div>

					<p className="text-sm text-gray-500 mt-4">
						This preview shows how your resume will look with the {templateName}{" "}
						template applied. You can select this template in Edit mode.
					</p>
				</div>
			</div>
		</div>
	);
};

export default TemplatePreviewModal;
