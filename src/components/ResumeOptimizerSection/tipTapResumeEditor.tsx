/**
 * Enhanced TipTapResumeEditor Component
 *
 * A powerful rich text editor specifically for resume editing.
 * Features:
 * - Rich text formatting capabilities
 * - Section-specific editing
 * - Support for applying suggestions
 * - Keyword integration removed from editor display
 * - ID preservation for resume sections
 */

"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  Sparkles,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Import custom section ID preservation extension
import { SectionNode } from "@/services/tipTapExtensions";

// Import the suggestion and keyword types
import {
  TipTapResumeEditorProps,
  IsActiveFunction,
  EditorAttributes,
  Suggestion,
} from "@/types/resumeTypes";

/**
 * Enhanced TipTapResumeEditor Component
 *
 * Rich text editor for resume content with extended functionality.
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
  // Local state for tracking content changes
  const [localContent, setLocalContent] = useState(content);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Suggestion[]>(
    []
  );
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [hasAppliedChanges, setHasAppliedChanges] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Configure and initialize the TipTap editor with immediatelyRender set to false to fix SSR issues
  // Fix: Remove duplicated extensions and only use StarterKit + custom extensions
  const editor = useEditor({
    extensions: [
      // StarterKit already includes Document, Paragraph, Text, and basic Heading
      StarterKit,
      // Add TextAlign as it's not included in StarterKit
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      // Add our custom extension to preserve section IDs
      SectionNode,
    ],
    content: localContent,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      // Get HTML content from editor
      const html = editor.getHTML();
      setLocalContent(html);

      // Call parent onChange handler
      onChange(html);
    },
    // Fix for SSR hydration issues
    immediatelyRender: false,
  });

  // Set mounted state after component mounts
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update editor content when prop changes and we haven't edited locally
  useEffect(() => {
    if (editor && content !== localContent && editor.isEditable) {
      editor.commands.setContent(content);
      setLocalContent(content);
    }
  }, [content, editor, localContent]);

  /**
   * Helper function to check if a formatting option is active
   * Properly typed to handle both string and object parameters
   */
  const isActive = useCallback(
    (typeOrAttrs: string | EditorAttributes, options = {}) => {
      if (!editor) return false;

      // Handle both forms of isActive calls
      if (typeof typeOrAttrs === "string") {
        return editor.isActive(typeOrAttrs, options);
      } else {
        // When passing an object like { textAlign: 'left' }
        return (editor.isActive as IsActiveFunction)(typeOrAttrs);
      }
    },
    [editor]
  );

  /**
   * Get section-specific placeholder text
   */
  const getSectionPlaceholder = (sectionType: string): string => {
    switch (sectionType) {
      case "summary":
        return "Enter your professional summary here...";
      case "experience":
        return "Enter your work experience details here...";
      case "education":
        return "Enter your educational background here...";
      case "skills":
        return "Enter your skills here, using bullet points for better readability...";
      default:
        return placeholder;
    }
  };

  // If not mounted yet (during SSR), render a placeholder
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

  // Render editor toolbar and content
  return (
    <div className="tiptap-editor border rounded-lg overflow-hidden">
      {/* Editor toolbar */}
      {!readOnly && editor && (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b">
          {/* Undo/Redo buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="h-8 w-8 p-0"
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="h-8 w-8 p-0"
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-1"></div>

          {/* Text formatting buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`h-8 w-8 p-0 ${isActive("bold") ? "bg-gray-200" : ""}`}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`h-8 w-8 p-0 ${isActive("italic") ? "bg-gray-200" : ""}`}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-1"></div>

          {/* Heading buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            className={`h-8 w-8 p-0 ${
              isActive("heading", { level: 1 }) ? "bg-gray-200" : ""
            }`}
            title="Heading 1"
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
            title="Heading 2"
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
            title="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-1"></div>

          {/* List buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`h-8 w-8 p-0 ${
              isActive("bulletList") ? "bg-gray-200" : ""
            }`}
            title="Bullet List"
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
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-1"></div>

          {/* Alignment buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            className={`h-8 w-8 p-0 ${
              isActive({ textAlign: "left" }) ? "bg-gray-200" : ""
            }`}
            title="Align Left"
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
            title="Align Center"
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
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Editor content area */}
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
