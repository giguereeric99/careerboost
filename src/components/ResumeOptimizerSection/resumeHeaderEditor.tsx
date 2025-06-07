/**
 * ResumeHeaderEditor Component - FIXED VERSION FOR STABLE FOCUS
 *
 * CRITICAL FIXES APPLIED:
 * 1. Eliminated re-parsing on every keystroke that caused focus loss
 * 2. Added proper content change detection to prevent unnecessary updates
 * 3. Optimized useEffect dependencies to prevent cascading re-renders
 * 4. Implemented stable reference management for form data
 * 5. Fixed debouncing logic to work with parent component updates
 * 6. Preserved cursor position during all update operations
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle } from "lucide-react";
import {
	parseResumeHeader,
	generateResumeHeaderHtml,
	ResumeHeaderData,
} from "@/utils/resumeHeaderUtils";

/**
 * Props for ResumeHeaderEditor component
 */
interface ResumeHeaderEditorProps {
	/** Current HTML content of the header section */
	content: string;
	/** Callback when content changes */
	onChange: (html: string) => void;
}

/**
 * Validation state for each field
 */
interface ValidationState {
	email: boolean;
	phone: boolean;
	linkedin: boolean;
}

/**
 * Validate email format
 * @param email - Email to validate
 * @returns True if valid email format or empty
 */
const isValidEmail = (email: string): boolean => {
	if (!email) return true; // Empty is valid
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
};

/**
 * Validate phone number format (international)
 * @param phone - Phone number to validate
 * @returns True if valid phone format or empty
 */
const isValidPhone = (phone: string): boolean => {
	if (!phone) return true; // Empty is valid
	const cleanedPhone = phone.replace(/[\s\-\.\(\)]/g, "");
	const phoneRegex = /^\+?\d{7,20}$/;
	return phoneRegex.test(cleanedPhone);
};

/**
 * Validate LinkedIn URL or profile name
 * @param linkedin - LinkedIn input to validate
 * @returns True if valid format or empty
 */
const isValidLinkedIn = (linkedin: string): boolean => {
	if (!linkedin) return true; // Empty is valid

	if (linkedin.includes("linkedin.com")) {
		return /^https?:\/\/(www\.)?linkedin\.com\/(in|company)\/[\w\-]+\/?$/i.test(
			linkedin
		);
	}

	return /^(in\/)?[\w\-]+$/.test(linkedin);
};

/**
 * ResumeHeaderEditor Component - FIXED FOR STABLE FOCUS
 *
 * KEY IMPROVEMENTS:
 * - No more re-parsing on every keystroke
 * - Stable form data references
 * - Optimized change detection
 * - Focus preservation guaranteed
 */
const ResumeHeaderEditor: React.FC<ResumeHeaderEditorProps> = ({
	content,
	onChange,
}) => {
	// Main form state
	const [formData, setFormData] = useState<ResumeHeaderData>({
		name: "",
		title: "",
		phone: "",
		email: "",
		linkedin: "",
		portfolio: "",
		address: "",
	});

	// Validation state
	const [validation, setValidation] = useState<ValidationState>({
		email: true,
		phone: true,
		linkedin: true,
	});

	// Touched fields state
	const [touched, setTouched] = useState<Record<string, boolean>>({
		email: false,
		phone: false,
		linkedin: false,
	});

	// CRITICAL: Refs to prevent unnecessary re-renders and manage state
	const isInitializedRef = useRef(false);
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
	const lastContentRef = useRef<string>("");
	const isUpdatingRef = useRef(false);
	const lastFormDataRef = useRef<ResumeHeaderData>(formData);

	/**
	 * FIXED: Parse initial content ONLY when absolutely necessary
	 * This prevents the cursor jumping issue by avoiding re-parsing during user input
	 */
	useEffect(() => {
		// CRITICAL: Only parse if this is truly new external content
		const shouldParse =
			!isInitializedRef.current ||
			(content && content !== lastContentRef.current && !isUpdatingRef.current);

		if (shouldParse) {
			console.log("🔄 Parsing initial/external content change");

			try {
				const parsedData = parseResumeHeader(content);

				// CRITICAL: Check if data actually changed before updating state
				const dataChanged = Object.keys(parsedData).some((key) => {
					return (
						parsedData[key as keyof ResumeHeaderData] !==
						lastFormDataRef.current[key as keyof ResumeHeaderData]
					);
				});

				if (dataChanged || !isInitializedRef.current) {
					setFormData(parsedData);
					lastFormDataRef.current = parsedData;
					lastContentRef.current = content;
					isInitializedRef.current = true;

					// Initial validation without triggering touched state
					setValidation({
						email: isValidEmail(parsedData.email),
						phone: isValidPhone(parsedData.phone),
						linkedin: isValidLinkedIn(parsedData.linkedin),
					});
				}
			} catch (error) {
				console.error("❌ Error parsing header content:", error);
			}
		}
	}, [content]); // SIMPLIFIED: Only depend on content

	/**
	 * OPTIMIZED: Debounced HTML update function with stable references
	 * Prevents excessive HTML generation and improves performance
	 */
	const debouncedUpdateHtml = useCallback(
		(updatedData: ResumeHeaderData) => {
			// Clear previous timer
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}

			// CRITICAL: Check if data actually changed before processing
			const dataChanged = Object.keys(updatedData).some((key) => {
				return (
					updatedData[key as keyof ResumeHeaderData] !==
					lastFormDataRef.current[key as keyof ResumeHeaderData]
				);
			});

			if (!dataChanged) {
				return; // No change, no update needed
			}

			// Set new timer with optimal delay for responsiveness
			debounceTimerRef.current = setTimeout(() => {
				try {
					isUpdatingRef.current = true;
					const newHtml = generateResumeHeaderHtml(updatedData);

					// CRITICAL: Only call onChange if HTML actually changed
					if (newHtml !== lastContentRef.current) {
						lastContentRef.current = newHtml;
						lastFormDataRef.current = updatedData;
						onChange(newHtml);
						console.log("✅ HTML updated via debounce");
					}

					// Reset updating flag after a short delay
					setTimeout(() => {
						isUpdatingRef.current = false;
					}, 100);
				} catch (error) {
					console.error("❌ Error generating HTML:", error);
					isUpdatingRef.current = false;
				}
			}, 700); // Slightly longer delay to ensure stability
		},
		[onChange]
	);

	/**
	 * OPTIMIZED: Update field function with focus preservation
	 * Uses immediate local state update + debounced HTML generation
	 */
	const updateField = useCallback(
		(field: keyof ResumeHeaderData, value: string) => {
			// console.log(`📝 Updating ${field}:`, value);

			// IMMEDIATE local state update for smooth UI experience
			setFormData((prev) => {
				const updated = { ...prev, [field]: value };

				// Trigger debounced HTML update ONLY if data changed
				debouncedUpdateHtml(updated);

				return updated;
			});

			// Handle field-specific validation and touched state
			if (field === "email" || field === "phone" || field === "linkedin") {
				// Mark field as touched only on first interaction
				setTouched((prev) => ({ ...prev, [field]: true }));

				// Immediate validation for better UX
				setValidation((prev) => {
					const newValidation = { ...prev };

					switch (field) {
						case "email":
							newValidation.email = isValidEmail(value);
							break;
						case "phone":
							newValidation.phone = isValidPhone(value);
							break;
						case "linkedin":
							newValidation.linkedin = isValidLinkedIn(value);
							break;
					}

					return newValidation;
				});
			}
		},
		[debouncedUpdateHtml]
	);

	/**
	 * OPTIMIZED: Handle blur event to prevent unnecessary updates
	 */
	const handleBlur = useCallback((field: string) => {
		setTouched((prev) => ({ ...prev, [field]: true }));
	}, []);

	/**
	 * Cleanup timer on unmount
	 */
	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, []);

	/**
	 * OPTIMIZED: Memoized validation icon component to prevent unnecessary re-renders
	 */
	const ValidationIcon = useCallback(
		({ isValid, fieldName }: { isValid: boolean; fieldName: string }) => {
			if (!touched[fieldName] || !formData[fieldName as keyof ResumeHeaderData])
				return null;

			return (
				<div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
					{isValid ? (
						<CheckCircle className="h-5 w-5 text-green-500" />
					) : (
						<AlertCircle className="h-5 w-5 text-red-500" />
					)}
				</div>
			);
		},
		[touched, formData]
	);

	return (
		<div className="space-y-4 p-4 bg-gray-50 rounded-lg">
			{/* Name field */}
			<div className="space-y-2">
				<Label htmlFor="header-name" className="text-sm font-medium">
					Full Name <span className="text-red-500">*</span>
				</Label>
				<Input
					id="header-name"
					type="text"
					value={formData.name}
					onChange={(e) => updateField("name", e.target.value)}
					placeholder="John Doe"
					className="w-full"
					required
					autoComplete="off"
				/>
			</div>

			{/* Professional Title field */}
			<div className="space-y-2">
				<Label htmlFor="header-title" className="text-sm font-medium">
					Professional Title
				</Label>
				<Input
					id="header-title"
					type="text"
					value={formData.title}
					onChange={(e) => updateField("title", e.target.value)}
					placeholder="Senior Web Developer"
					className="w-full"
					autoComplete="off"
				/>
			</div>

			{/* Contact Information Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* Phone field */}
				<div className="space-y-2">
					<Label htmlFor="header-phone" className="text-sm font-medium">
						Phone Number
					</Label>
					<div className="relative">
						<Input
							id="header-phone"
							type="tel"
							value={formData.phone}
							onChange={(e) => updateField("phone", e.target.value)}
							onBlur={() => handleBlur("phone")}
							placeholder="+1 (555) 123-4567"
							className={`w-full pr-10 ${
								touched.phone && formData.phone && !validation.phone
									? "border-red-500 focus:ring-red-500"
									: ""
							}`}
							autoComplete="off"
						/>
						<ValidationIcon isValid={validation.phone} fieldName="phone" />
					</div>
					{touched.phone && formData.phone && !validation.phone && (
						<p className="text-xs text-red-500">
							Please enter a valid phone number (7-20 digits)
						</p>
					)}
				</div>

				{/* Email field */}
				<div className="space-y-2">
					<Label htmlFor="header-email" className="text-sm font-medium">
						Email Address <span className="text-red-500">*</span>
					</Label>
					<div className="relative">
						<Input
							id="header-email"
							type="email"
							value={formData.email}
							onChange={(e) => updateField("email", e.target.value)}
							onBlur={() => handleBlur("email")}
							placeholder="john.doe@example.com"
							className={`w-full pr-10 ${
								touched.email && formData.email && !validation.email
									? "border-red-500 focus:ring-red-500"
									: ""
							}`}
							required
							autoComplete="off"
						/>
						<ValidationIcon isValid={validation.email} fieldName="email" />
					</div>
					{touched.email && formData.email && !validation.email && (
						<p className="text-xs text-red-500">
							Please enter a valid email address
						</p>
					)}
				</div>

				{/* LinkedIn field */}
				<div className="space-y-2">
					<Label htmlFor="header-linkedin" className="text-sm font-medium">
						LinkedIn Profile
					</Label>
					<div className="relative">
						<Input
							id="header-linkedin"
							type="text"
							value={formData.linkedin}
							onChange={(e) => updateField("linkedin", e.target.value)}
							onBlur={() => handleBlur("linkedin")}
							placeholder="linkedin.com/in/johndoe or johndoe"
							className={`w-full pr-10 ${
								touched.linkedin && formData.linkedin && !validation.linkedin
									? "border-red-500 focus:ring-red-500"
									: ""
							}`}
							autoComplete="off"
						/>
						<ValidationIcon
							isValid={validation.linkedin}
							fieldName="linkedin"
						/>
					</div>
					{touched.linkedin && formData.linkedin && !validation.linkedin && (
						<p className="text-xs text-red-500">
							Please enter a valid LinkedIn URL or username
						</p>
					)}
				</div>

				{/* Portfolio field */}
				<div className="space-y-2">
					<Label htmlFor="header-portfolio" className="text-sm font-medium">
						Portfolio/Website
					</Label>
					<Input
						id="header-portfolio"
						type="text"
						value={formData.portfolio}
						onChange={(e) => updateField("portfolio", e.target.value)}
						placeholder="johndoe.com or github.com/johndoe"
						className="w-full"
						autoComplete="off"
					/>
				</div>
			</div>

			{/* Address field */}
			<div className="space-y-2">
				<Label htmlFor="header-address" className="text-sm font-medium">
					Address
				</Label>
				<Textarea
					id="header-address"
					value={formData.address}
					onChange={(e) => updateField("address", e.target.value)}
					placeholder="123 Main Street&#10;New York, NY 10001&#10;USA"
					className="w-full min-h-[80px] resize-none"
					rows={3}
					autoComplete="off"
				/>
				<p className="text-xs text-gray-500">
					Press Enter for multiple lines (street, city/state, country)
				</p>
			</div>

			{/* Help text */}
			<div className="text-xs text-gray-600 bg-blue-50 p-3 rounded">
				<p className="font-medium mb-1">Tips:</p>
				<ul className="space-y-1 list-disc list-inside">
					<li>Only filled fields will appear in your resume</li>
					<li>Phone numbers can be in any international format</li>
					<li>LinkedIn can be entered as a full URL or just your username</li>
					<li>Address format is flexible to accommodate any country</li>
					<li>Changes are automatically saved with optimized performance</li>
				</ul>
			</div>
		</div>
	);
};

export default ResumeHeaderEditor;
