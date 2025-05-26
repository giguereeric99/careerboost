/**
 * ResumeHeaderEditor Component - Optimized Version
 *
 * Fixes applied:
 * 1. Eliminated state management conflicts
 * 2. Added debouncing for HTML updates
 * 3. Optimized validation
 * 4. Prevented unnecessary re-renders
 * 5. Preserved focus and cursor position
 * 6. Improved performance and user experience
 * 7. Fixed TypeScript error with useRef initialization
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
 * ResumeHeaderEditor Component - Optimized Version
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

  // Refs to prevent unnecessary re-renders and manage state
  const isInitializedRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null); // Fixed: Added initial value
  const lastContentRef = useRef<string>("");
  const isUpdatingRef = useRef(false);

  /**
   * Parse initial content ONLY on first mount or when external content truly changes
   * This prevents the cursor jumping issue by avoiding re-parsing during user input
   */
  useEffect(() => {
    // Only parse if not initialized OR if content changed externally (not from our updates)
    if (
      !isInitializedRef.current ||
      (content && content !== lastContentRef.current && !isUpdatingRef.current)
    ) {
      try {
        console.log("🔄 Parsing initial/external content change");
        const parsedData = parseResumeHeader(content);
        setFormData(parsedData);
        lastContentRef.current = content;
        isInitializedRef.current = true;

        // Initial validation without triggering touched state
        setValidation({
          email: isValidEmail(parsedData.email),
          phone: isValidPhone(parsedData.phone),
          linkedin: isValidLinkedIn(parsedData.linkedin),
        });
      } catch (error) {
        console.error("❌ Error parsing header content:", error);
      }
    }
  }, [content]);

  /**
   * Debounced HTML update function
   * Prevents excessive HTML generation and improves performance
   */
  const debouncedUpdateHtml = useCallback(
    (updatedData: ResumeHeaderData) => {
      // Clear previous timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer with reduced delay for better responsiveness
      debounceTimerRef.current = setTimeout(() => {
        try {
          isUpdatingRef.current = true;
          const newHtml = generateResumeHeaderHtml(updatedData);
          lastContentRef.current = newHtml;
          onChange(newHtml);
          console.log("✅ HTML updated via debounce");

          // Reset updating flag after a short delay
          setTimeout(() => {
            isUpdatingRef.current = false;
          }, 100);
        } catch (error) {
          console.error("❌ Error generating HTML:", error);
          isUpdatingRef.current = false;
        }
      }, 200); // Reduced from 300ms to 200ms for better responsiveness
    },
    [onChange]
  );

  /**
   * Update field - Optimized version that prevents cursor jumping
   * Uses immediate local state update + debounced HTML generation
   */
  const updateField = useCallback(
    (field: keyof ResumeHeaderData, value: string) => {
      console.log(`📝 Updating ${field}:`, value);

      // Immediate local state update (for smooth UI experience)
      setFormData((prev) => {
        const updated = { ...prev, [field]: value };

        // Trigger debounced HTML update
        debouncedUpdateHtml(updated);

        return updated;
      });

      // Handle field-specific validation and touched state
      if (field === "email" || field === "phone" || field === "linkedin") {
        // Mark field as touched only on first interaction
        setTouched((prev) => ({ ...prev, [field]: true }));

        // Immediate validation for better UX (but debounced HTML update)
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
   * Handle blur event - Optimized to prevent unnecessary updates
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
   * Memoized validation icon component to prevent unnecessary re-renders
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
          autoComplete="name"
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
          autoComplete="organization-title"
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
              autoComplete="tel"
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
              autoComplete="email"
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
              autoComplete="url"
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
            autoComplete="url"
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
          autoComplete="street-address"
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
          <li>
            Changes are automatically saved with a small delay for better
            performance
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ResumeHeaderEditor;
