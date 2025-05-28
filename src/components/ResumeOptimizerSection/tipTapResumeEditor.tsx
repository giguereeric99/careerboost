/**
 * Enhanced TipTapResumeEditor Component - DEBOUNCED ONCHANGE VERSION
 *
 * ENHANCED: Uses debounced onChange instead of onBlur for optimal UX
 * - Immediate local state updates for smooth typing experience
 * - Debounced parent updates to prevent excessive re-renders
 * - onBlur backup for immediate save on focus loss
 * - Prevents cascading re-renders and focus loss issues
 * - 300ms debounce delay for optimal responsiveness
 */

"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { Button } from "@/components/ui/button";
import {
	Bold,
	Italic,
	List,
	ListOrdered,
	Heading1,
	Heading2,
	Heading3,
	Undo,
	Redo,
	AlignLeft,
	AlignCenter,
	AlignRight,
} from "lucide-react";

// Import custom section ID preservation extension
import { SectionNode } from "@/services/tipTapExtensions";

// Import the suggestion and keyword types
import {
	TipTapResumeEditorProps,
	IsActiveFunction,
	EditorAttributes,
} from "@/types/resumeTypes";

/**
 * Enhanced TipTapResumeEditor Component with Debounced onChange
 *
 * Key optimizations:
 * - Uses debounced onChange for automatic updates during typing
 * - onBlur as backup for immediate save on focus loss
 * - Local state management for immediate UI feedback
 * - Performance optimized with content change detection
 */
const TipTapResumeEditor: React.FC<TipTapResumeEditorProps> = ({
	content,
	onChange,
	readOnly = false,
	placeholder = "Enter your content here...",
	language = "English",
	resumeId,
	onApplyChanges,
	canApplyChanges = true,
	sectionType = "generic",
}) => {
	// ===== LOCAL STATE MANAGEMENT =====

	// Local content state for immediate UI feedback during typing
	const [localContent, setLocalContent] = useState(content);

	// Track component mount state for SSR handling
	const [isMounted, setIsMounted] = useState(false);

	// ===== PERFORMANCE OPTIMIZATION REFS =====

	// Timer ref for debouncing onChange updates
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

	// Track last content sent to parent to avoid unnecessary updates
	const lastContentRef = useRef<string>(content);

	// Flag to prevent multiple simultaneous updates
	const isUpdatingRef = useRef<boolean>(false);

	// ===== DEBOUNCED ONCHANGE IMPLEMENTATION =====

	/**
	 * Debounced onChange handler for optimal performance
	 * - 300ms delay to allow smooth typing
	 * - Content change detection to avoid unnecessary updates
	 * - Performance flags to prevent simultaneous updates
	 */
	const debouncedOnChange = useCallback(
		(html: string) => {
			// Clear previous debounce timer
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}

			// CRITICAL: Check if content actually changed before processing
			if (html === lastContentRef.current) {
				console.log("📝 Content unchanged, skipping debounced update");
				return; // No change, no update needed
			}

			// Set new timer with 300ms delay for optimal responsiveness
			debounceTimerRef.current = setTimeout(() => {
				try {
					// Prevent multiple simultaneous updates
					if (isUpdatingRef.current) {
						console.log("⏳ Update already in progress, skipping");
						return;
					}

					isUpdatingRef.current = true;

					// CRITICAL: Double-check content hasn't changed during debounce delay
					if (html !== lastContentRef.current) {
						lastContentRef.current = html;
						onChange(html);
						console.log("✅ Editor content updated via debounced onChange");
					}

					// Reset updating flag after a short delay to allow processing
					setTimeout(() => {
						isUpdatingRef.current = false;
					}, 100);
				} catch (error) {
					console.error("❌ Error in debounced onChange:", error);
					// Ensure flag is reset even on error
					isUpdatingRef.current = false;
				}
			}, 1000); // 300ms debounce delay - same as ResumeHeaderEditor
		},
		[onChange]
	);

	// ===== IMMEDIATE BLUR HANDLER =====

	/**
	 * Handle immediate content update when editor loses focus
	 * - Backup for debounced onChange to ensure no data loss
	 * - Cancels pending debounced update for immediate save
	 * - Critical for preserving content when user navigates away
	 */
	const handleBlurUpdate = useCallback(
		(html: string) => {
			console.log("👁️ Editor blur detected, checking for immediate update");

			// Clear any pending debounced update since we're doing immediate update
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
				debounceTimerRef.current = null;
				console.log(
					"⏰ Cleared pending debounced update for immediate blur save"
				);
			}

			// Check if content has actually changed since last update
			if (html === lastContentRef.current) {
				console.log("📝 Content unchanged on blur, no update needed");
				return;
			}

			// Prevent multiple simultaneous updates
			if (isUpdatingRef.current) {
				console.log("⏳ Update already in progress, skipping blur update");
				return;
			}

			try {
				isUpdatingRef.current = true;

				// Immediate update on blur to ensure no data loss
				lastContentRef.current = html;
				onChange(html);
				console.log("✅ Editor content updated immediately on blur");

				// Reset flag after brief delay
				setTimeout(() => {
					isUpdatingRef.current = false;
				}, 100);
			} catch (error) {
				console.error("❌ Error in blur update:", error);
				isUpdatingRef.current = false;
			}
		},
		[onChange]
	);

	// ===== TIPTAP EDITOR CONFIGURATION =====

	/**
	 * Configure and initialize the TipTap editor with optimized event handlers
	 */
	const editor = useEditor({
		extensions: [
			StarterKit,
			TextAlign.configure({
				types: ["heading", "paragraph"],
			}),
			SectionNode, // Custom extension for preserving section IDs
		],
		content: localContent,
		editable: !readOnly,

		// ✅ ENHANCED: onUpdate triggers both local state and debounced parent update
		onUpdate: ({ editor }) => {
			const html = editor.getHTML();

			// Immediate local state update for smooth typing experience
			setLocalContent(html);

			// Debounced parent update to prevent excessive re-renders
			if (!readOnly) {
				debouncedOnChange(html);
			}
		},

		// ✅ ENHANCED: onBlur provides immediate backup save on focus loss
		onBlur: ({ editor }) => {
			if (!readOnly) {
				handleBlurUpdate(editor.getHTML());
			}
		},

		// Fix for SSR hydration issues - prevents server/client mismatch
		immediatelyRender: false,
	});

	// ===== COMPONENT LIFECYCLE EFFECTS =====

	/**
	 * Set mounted state after component mounts to handle SSR properly
	 */
	useEffect(() => {
		setIsMounted(true);
		console.log("🎯 TipTapResumeEditor mounted and ready");
	}, []);

	/**
	 * Handle external content changes from parent component
	 * - Updates editor content when parent content changes
	 * - Prevents infinite update loops with change detection
	 * - Updates tracking references for consistency
	 */
	useEffect(() => {
		if (
			editor &&
			content !== localContent &&
			content !== lastContentRef.current &&
			!isUpdatingRef.current // Prevent updates during our own onChange process
		) {
			console.log("📥 External content change detected, updating editor");
			editor.commands.setContent(content);
			setLocalContent(content);
			lastContentRef.current = content;
		}
	}, [content, editor, localContent]);

	/**
	 * Cleanup timers on component unmount to prevent memory leaks
	 */
	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
				console.log("🧹 Cleaned up debounce timer on unmount");
			}
		};
	}, []);

	// ===== EDITOR HELPER FUNCTIONS =====

	/**
	 * Helper function to check if a formatting option is currently active
	 * - Supports both string types and attribute objects
	 * - Safely handles cases where editor is not initialized
	 *
	 * @param typeOrAttrs - Format type (string) or attributes object
	 * @param options - Additional options for the active check
	 * @returns Boolean indicating if the format is active
	 */
	const isActive = useCallback(
		(typeOrAttrs: string | EditorAttributes, options = {}) => {
			if (!editor) {
				return false;
			}

			// Handle string-based format types (e.g., "bold", "italic")
			if (typeof typeOrAttrs === "string") {
				return editor.isActive(typeOrAttrs, options);
			} else {
				// Handle attribute-based format types (e.g., {textAlign: "center"})
				return (editor.isActive as IsActiveFunction)(typeOrAttrs);
			}
		},
		[editor]
	);

	/**
	 * Get section-specific placeholder text based on section type
	 * - Provides contextual placeholders for different resume sections
	 * - Improves user experience with relevant guidance
	 *
	 * @param sectionType - The type of resume section
	 * @returns Appropriate placeholder text for the section
	 */
	const getSectionPlaceholder = useCallback(
		(sectionType: string): string => {
			const placeholders: Record<string, string> = {
				summary: "Enter your professional summary here...",
				experience: "Enter your work experience details here...",
				education: "Enter your educational background here...",
				skills:
					"Enter your skills here, use bullet points for better readability...",
				languages: "Enter the languages you speak...",
				certifications: "Enter your professional certifications...",
				projects: "Enter your important projects...",
				awards: "Enter your awards and achievements...",
				references: "Enter your professional references...",
				publications: "Enter your publications...",
				volunteering: "Enter your volunteer experience...",
				additional: "Enter additional information...",
				interests: "Enter your personal interests...",
			};

			return placeholders[sectionType] || placeholder;
		},
		[placeholder]
	);

	// ===== SSR HANDLING =====

	/**
	 * If component not mounted yet (during SSR), render a static placeholder
	 * - Prevents hydration mismatches between server and client
	 * - Shows content without interactive features during initial load
	 */
	if (!isMounted) {
		return (
			<div className="tiptap-editor border rounded-lg overflow-hidden">
				<div className="p-4">
					<div className="prose prose-sm max-w-none min-h-[250px] focus:outline-none">
						<div dangerouslySetInnerHTML={{ __html: content }} />
					</div>
				</div>
			</div>
		);
	}

	// ===== MAIN COMPONENT RENDER =====

	return (
		<div className="tiptap-editor border rounded-lg overflow-hidden">
			{/* ===== EDITOR TOOLBAR ===== */}
			{!readOnly && editor && (
				<div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b">
					{/* Undo/Redo Controls */}
					<Button
						variant="ghost"
						size="sm"
						onClick={() => editor.chain().focus().undo().run()}
						disabled={!editor.can().undo()}
						className="h-8 w-8 p-0"
						title="Undo last action"
					>
						<Undo className="h-4 w-4" />
					</Button>

					<Button
						variant="ghost"
						size="sm"
						onClick={() => editor.chain().focus().redo().run()}
						disabled={!editor.can().redo()}
						className="h-8 w-8 p-0"
						title="Redo last undone action"
					>
						<Redo className="h-4 w-4" />
					</Button>

					{/* Visual separator */}
					<div className="w-px h-6 bg-gray-300 mx-1"></div>

					{/* Text Formatting Controls */}
					<Button
						variant="ghost"
						size="sm"
						onClick={() => editor.chain().focus().toggleBold().run()}
						className={`h-8 w-8 p-0 ${isActive("bold") ? "bg-gray-200" : ""}`}
						title="Toggle bold formatting"
					>
						<Bold className="h-4 w-4" />
					</Button>

					<Button
						variant="ghost"
						size="sm"
						onClick={() => editor.chain().focus().toggleItalic().run()}
						className={`h-8 w-8 p-0 ${isActive("italic") ? "bg-gray-200" : ""}`}
						title="Toggle italic formatting"
					>
						<Italic className="h-4 w-4" />
					</Button>

					{/* Visual separator */}
					<div className="w-px h-6 bg-gray-300 mx-1"></div>

					{/* Heading Controls */}
					<Button
						variant="ghost"
						size="sm"
						onClick={() =>
							editor.chain().focus().toggleHeading({ level: 1 }).run()
						}
						className={`h-8 w-8 p-0 ${
							isActive("heading", { level: 1 }) ? "bg-gray-200" : ""
						}`}
						title="Toggle Heading 1"
					>
						<Heading1 className="h-4 w-4" />
					</Button>

					<Button
						variant="ghost"
						size="sm"
						onClick={() =>
							editor.chain().focus().toggleHeading({ level: 2 }).run()
						}
						className={`h-8 w-8 p-0 ${
							isActive("heading", { level: 2 }) ? "bg-gray-200" : ""
						}`}
						title="Toggle Heading 2"
					>
						<Heading2 className="h-4 w-4" />
					</Button>

					<Button
						variant="ghost"
						size="sm"
						onClick={() =>
							editor.chain().focus().toggleHeading({ level: 3 }).run()
						}
						className={`h-8 w-8 p-0 ${
							isActive("heading", { level: 3 }) ? "bg-gray-200" : ""
						}`}
						title="Toggle Heading 3"
					>
						<Heading3 className="h-4 w-4" />
					</Button>

					{/* Visual separator */}
					<div className="w-px h-6 bg-gray-300 mx-1"></div>

					{/* List Controls */}
					<Button
						variant="ghost"
						size="sm"
						onClick={() => editor.chain().focus().toggleBulletList().run()}
						className={`h-8 w-8 p-0 ${
							isActive("bulletList") ? "bg-gray-200" : ""
						}`}
						title="Toggle bullet list"
					>
						<List className="h-4 w-4" />
					</Button>

					<Button
						variant="ghost"
						size="sm"
						onClick={() => editor.chain().focus().toggleOrderedList().run()}
						className={`h-8 w-8 p-0 ${
							isActive("orderedList") ? "bg-gray-200" : ""
						}`}
						title="Toggle numbered list"
					>
						<ListOrdered className="h-4 w-4" />
					</Button>

					{/* Visual separator */}
					<div className="w-px h-6 bg-gray-300 mx-1"></div>

					{/* Text Alignment Controls */}
					<Button
						variant="ghost"
						size="sm"
						onClick={() => editor.chain().focus().setTextAlign("left").run()}
						className={`h-8 w-8 p-0 ${
							isActive({ textAlign: "left" }) ? "bg-gray-200" : ""
						}`}
						title="Align text to left"
					>
						<AlignLeft className="h-4 w-4" />
					</Button>

					<Button
						variant="ghost"
						size="sm"
						onClick={() => editor.chain().focus().setTextAlign("center").run()}
						className={`h-8 w-8 p-0 ${
							isActive({ textAlign: "center" }) ? "bg-gray-200" : ""
						}`}
						title="Center align text"
					>
						<AlignCenter className="h-4 w-4" />
					</Button>

					<Button
						variant="ghost"
						size="sm"
						onClick={() => editor.chain().focus().setTextAlign("right").run()}
						className={`h-8 w-8 p-0 ${
							isActive({ textAlign: "right" }) ? "bg-gray-200" : ""
						}`}
						title="Align text to right"
					>
						<AlignRight className="h-4 w-4" />
					</Button>
				</div>
			)}

			{/* ===== EDITOR CONTENT AREA ===== */}
			<div className="p-4">
				<EditorContent
					editor={editor}
					className="prose prose-sm max-w-none min-h-[250px] focus:outline-none"
					placeholder={getSectionPlaceholder(sectionType)}
				/>
			</div>
		</div>
	);
};

export default TipTapResumeEditor;
