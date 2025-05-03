/**
 * TipTapResumeEditor Component
 * 
 * A simplified version of TipTap editor specifically for resume editing.
 * Provides rich text formatting capabilities while maintaining the structure
 * needed for resume sections.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Paragraph from '@tiptap/extension-paragraph';
import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import TextAlign from '@tiptap/extension-text-align';
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
  AlignRight
} from "lucide-react";

import { Suggestion } from '@/types/resume';

/**
 * Interface for TipTapResumeEditor component props
 */
interface TipTapResumeEditorProps {
  content: string;               // HTML content to edit
  onChange: (html: string) => void; // Callback when content changes
  appliedKeywords?: string[];    // Keywords that can be applied to the resume
  onApplyKeyword?: (keyword: string) => void; // Callback when keyword is applied
  suggestions?: Suggestion[];    // AI suggestions for improving the resume
  onApplySuggestion?: (suggestion: Suggestion) => void; // Callback when suggestion is applied
  readOnly?: boolean;            // Whether the editor is in read-only mode
  placeholder?: string;          // Placeholder text when empty
}

/**
 * TipTapResumeEditor Component
 * 
 * Rich text editor for resume content using TipTap.
 * Supports common text formatting, lists, headings, and more.
 */
const TipTapResumeEditor: React.FC<TipTapResumeEditorProps> = ({
  content,
  onChange,
  appliedKeywords = [],
  onApplyKeyword,
  suggestions = [],
  onApplySuggestion,
  readOnly = false,
  placeholder = 'Enter your content here...'
}) => {
  // Local state for tracking content changes
  const [localContent, setLocalContent] = useState(content);
  
  // Configure and initialize the TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Document,
      Paragraph,
      Text,
      Heading.configure({
        levels: [1, 2, 3],
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: localContent,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      // Get HTML content from editor
      const html = editor.getHTML();
      setLocalContent(html);
      
      // Call parent onChange handler
      onChange(html);
    }
  });

  // Update editor content when prop changes and we haven't edited locally
  useEffect(() => {
    if (editor && content !== localContent && editor.isEditable) {
      editor.commands.setContent(content);
      setLocalContent(content);
    }
  }, [content, editor, localContent]);

  /**
   * Helper function to check if a formatting option is active
   */
  const isActive = (type: string, options = {}) => {
    if (!editor) return false;
    return editor.isActive(type, options);
  };

  /**
   * Insert keyword at cursor position
   */
  const insertKeyword = (keyword: string) => {
    if (!editor || !onApplyKeyword) return;
    
    // Insert keyword at current cursor position
    editor.chain().focus().insertContent(keyword).run();
    
    // Call the parent handler
    onApplyKeyword(keyword);
  };

  /**
   * Apply a suggestion to the content
   */
  const applySuggestion = (suggestion: Suggestion) => {
    if (!editor || !onApplySuggestion) return;
    
    // This is a simplified approach - in a real app, you'd have more logic
    // for properly applying different types of suggestions
    editor.chain().focus().insertContent(suggestion.text).run();
    
    // Call the parent handler
    onApplySuggestion(suggestion);
  };

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
            className={`h-8 w-8 p-0 ${isActive('bold') ? 'bg-gray-200' : ''}`}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`h-8 w-8 p-0 ${isActive('italic') ? 'bg-gray-200' : ''}`}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-gray-300 mx-1"></div>
          
          {/* Heading buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`h-8 w-8 p-0 ${isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}`}
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`h-8 w-8 p-0 ${isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}`}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`h-8 w-8 p-0 ${isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''}`}
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
            className={`h-8 w-8 p-0 ${isActive('bulletList') ? 'bg-gray-200' : ''}`}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`h-8 w-8 p-0 ${isActive('orderedList') ? 'bg-gray-200' : ''}`}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-gray-300 mx-1"></div>
          
          {/* Alignment buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`h-8 w-8 p-0 ${isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''}`}
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`h-8 w-8 p-0 ${isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''}`}
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`h-8 w-8 p-0 ${isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''}`}
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
        />
      </div>
      
      {/* Applied keywords section (if provided) */}
      {!readOnly && appliedKeywords.length > 0 && (
        <div className="p-4 border-t bg-gray-50">
          <p className="text-sm font-medium mb-2">Keywords</p>
          <div className="flex flex-wrap gap-1">
            {appliedKeywords.map((keyword, index) => (
              <Button
                key={index}
                variant="outline" 
                size="sm"
                className="text-xs"
                onClick={() => insertKeyword(keyword)}
              >
                {keyword}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      {/* Suggestions section (if provided) */}
      {!readOnly && suggestions.length > 0 && (
        <div className="p-4 border-t bg-gray-50">
          <p className="text-sm font-medium mb-2">Suggestions</p>
          <div className="space-y-2">
            {suggestions
              .filter(s => !s.isApplied)
              .map((suggestion, index) => (
                <div 
                  key={index} 
                  className="flex justify-between items-center p-2 bg-white rounded border hover:bg-gray-50"
                >
                  <p className="text-sm">{suggestion.text}</p>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => applySuggestion(suggestion)}
                  >
                    Apply
                  </Button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TipTapResumeEditor;