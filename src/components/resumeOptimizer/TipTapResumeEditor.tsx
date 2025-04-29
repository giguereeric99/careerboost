/**
 * TipTapResumeEditor Component (Improved)
 * 
 * An enhanced WYSIWYG editor for resume content using TipTap.
 * Includes support for section IDs, visual styling, and pre-styled sections.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent, Editor, HTMLContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Paragraph from '@tiptap/extension-paragraph';
import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import TextAlign from '@tiptap/extension-text-align';
import { Extension } from '@tiptap/core';
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Heading1, 
  Heading2, 
  Heading3,
  Type, 
  Palette,
  MoveVertical,
  Plus,
  Layout
} from "lucide-react";

/**
 * Interface for TipTapResumeEditor props
 */
interface TipTapResumeEditorProps {
  content: string;
  onChange: (html: string) => void;
  appliedKeywords?: string[];
  onApplyKeyword?: (keyword: string) => void;
  suggestions?: { text: string; type: string; isApplied?: boolean; }[];
  onApplySuggestion?: (suggestion: any) => void;
  readOnly?: boolean;
}

/**
 * Custom Node extension for resume sections with IDs
 */
const SectionNode = Extension.create({
  name: 'section',
  
  // Add section tag to the whitelist
  addGlobalAttributes() {
    return [
      {
        types: ['heading', 'paragraph'],
        attributes: {
          sectionId: {
            default: null,
            parseHTML: element => element.closest('section')?.getAttribute('id') || null,
            renderHTML: attributes => {
              if (!attributes.sectionId) {
                return {};
              }
              
              return {
                'data-section-id': attributes.sectionId
              };
            }
          }
        }
      }
    ];
  },
  
  addNodeView() {
    return ({ HTMLAttributes, node }) => {
      const dom = document.createElement('section');
      
      if (HTMLAttributes.id) {
        dom.setAttribute('id', HTMLAttributes.id);
      }
      
      if (HTMLAttributes.class) {
        dom.setAttribute('class', HTMLAttributes.class);
      }
      
      return {
        dom,
        contentDOM: dom
      };
    };
  }
});

/**
 * Pre-defined sections for a resume
 */
const resumeSections = [
  { id: 'resume-header', label: 'Header (Name & Contact)' },
  { id: 'resume-summary', label: 'Professional Summary' },
  { id: 'resume-experience', label: 'Experience' },
  { id: 'resume-education', label: 'Education' },
  { id: 'resume-skills', label: 'Skills' },
  { id: 'resume-languages', label: 'Languages' },
  { id: 'resume-certifications', label: 'Certifications' },
  { id: 'resume-projects', label: 'Projects' }
];

/**
 * Menu bar component for the editor with enhanced section management
 */
const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  // Font sizes available in the editor
  const fontSizes = [
    { value: '12px', label: '12px' },
    { value: '14px', label: '14px' },
    { value: '16px', label: '16px' },
    { value: '18px', label: '18px' },
    { value: '20px', label: '20px' },
    { value: '24px', label: '24px' },
    { value: '30px', label: '30px' },
    { value: '36px', label: '36px' },
  ];

  // Font families available in the editor
  const fontFamilies = [
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: 'Times New Roman, serif', label: 'Times New Roman' },
    { value: 'Courier New, monospace', label: 'Courier New' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: 'Verdana, sans-serif', label: 'Verdana' },
    { value: 'Tahoma, sans-serif', label: 'Tahoma' },
  ];

  // Add a new section with heading
  const addSection = (sectionId: string, sectionTitle: string) => {
    const sectionLabel = resumeSections.find(s => s.id === sectionId)?.label || sectionTitle;
    
    editor.chain()
      .focus()
      .insertContent(`<section id="${sectionId}"><h2>${sectionLabel}</h2><p>Enter content here...</p></section>`)
      .run();
  };

  return (
    <div className="border rounded-md p-1 mb-2 bg-white">
      {/* Main toolbar */}
      <div className="flex flex-wrap items-center gap-1 mb-1">
        {/* Headings */}
        <div className="flex items-center gap-1 mr-2">
          <Toggle
            size="sm"
            pressed={editor.isActive('heading', { level: 1 })}
            onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            aria-label="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive('heading', { level: 2 })}
            onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            aria-label="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive('heading', { level: 3 })}
            onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            aria-label="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </Toggle>
        </div>

        {/* Text formatting */}
        <div className="flex items-center gap-1 mr-2">
          <Toggle
            size="sm"
            pressed={editor.isActive('bold')}
            onPressedChange={() => editor.chain().focus().toggleBold().run()}
            aria-label="Bold"
          >
            <Bold className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive('italic')}
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            aria-label="Italic"
          >
            <Italic className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive('underline')}
            onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
            aria-label="Underline"
          >
            <Underline className="h-4 w-4" />
          </Toggle>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1 mr-2">
          <Toggle
            size="sm"
            pressed={editor.isActive('bulletList')}
            onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
            aria-label="Bullet List"
          >
            <List className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive('orderedList')}
            onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
            aria-label="Ordered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Toggle>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-1 mr-2">
          <Toggle
            size="sm"
            pressed={editor.isActive({ textAlign: 'left' })}
            onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
            aria-label="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive({ textAlign: 'center' })}
            onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
            aria-label="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive({ textAlign: 'right' })}
            onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
            aria-label="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </Toggle>
        </div>

        {/* Font size */}
        <div className="flex items-center gap-1 mr-2">
          <Select
            onValueChange={(value) => {
              editor.chain().focus().setFontSize(value).run();
            }}
            defaultValue="16px"
          >
            <SelectTrigger className="h-8 w-20">
              <Type className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              {fontSizes.map((size) => (
                <SelectItem key={size.value} value={size.value}>
                  {size.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Font family */}
        <div className="flex items-center gap-1 mr-2">
          <Select
            onValueChange={(value) => {
              editor.chain().focus().setFontFamily(value).run();
            }}
            defaultValue="Arial, sans-serif"
          >
            <SelectTrigger className="h-8 w-40">
              <MoveVertical className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent>
              {fontFamilies.map((font) => (
                <SelectItem key={font.value} value={font.value}>
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Color picker */}
        <div className="flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-2">
                <Palette className="h-4 w-4 mr-1" />
                Color
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="grid grid-cols-8 gap-1">
                {[
                  '#000000', '#5c5c5c', '#8a8a8a', '#b5b5b5', '#eeeeee', '#ffffff',
                  '#a81c1c', '#e74c3c', '#f39c12', '#f1c40f', '#2ecc71', '#1abc9c',
                  '#3498db', '#2980b9', '#9b59b6', '#8e44ad', '#2c3e50', '#34495e'
                ].map((color) => (
                  <button
                    key={color}
                    className="w-6 h-6 rounded-sm border border-gray-300"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      editor.chain().focus().setColor(color).run();
                    }}
                    title={color}
                    aria-label={`Set text color to ${color}`}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Clear formatting */}
        <div className="ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().unsetAllMarks().run()}
            className="h-8"
          >
            Clear formatting
          </Button>
        </div>
      </div>
      
      {/* Section management toolbar */}
      <div className="flex items-center gap-2 p-1 bg-gray-50 rounded border-t">
        <Layout className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700 mr-2">Add Section:</span>
        <Select
          onValueChange={(sectionId) => {
            const section = resumeSections.find(s => s.id === sectionId);
            if (section) {
              addSection(section.id, section.label);
            }
          }}
        >
          <SelectTrigger className="h-8 max-w-xs">
            <Plus className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Add section..." />
          </SelectTrigger>
          <SelectContent>
            {resumeSections.map((section) => (
              <SelectItem key={section.id} value={section.id}>
                {section.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Apply default styling to the entire document
            editor.chain()
              .focus()
              .setFontFamily('Arial, sans-serif')
              .run();
            
            // Find all section tags and add styling
            const dom = editor.view.dom;
            const sections = dom.querySelectorAll('section');
            
            sections.forEach(section => {
              // Add proper spacing between sections
              section.style.marginBottom = '1rem';
              section.style.paddingBottom = '0.5rem';
              
              // Style headings within sections
              const headings = section.querySelectorAll('h1, h2, h3');
              headings.forEach(heading => {
                if (heading.tagName === 'H1') {
                  editor.chain().setNodeSelection(editor.state.doc.resolve(editor.state.doc.content.findIndex(node => node.type.name === 'heading' && node.attrs.level === 1)))
                    .setFontSize('24px')
                    .setBold()
                    .run();
                } else if (heading.tagName === 'H2') {
                  heading.style.borderBottom = '1px solid #ddd';
                  heading.style.fontSize = '18px';
                  heading.style.fontWeight = 'bold';
                  heading.style.textTransform = 'uppercase';
                }
              });
            });
            
            // Update content to reflect styling changes
            editor.commands.focus();
          }}
          className="ml-auto"
        >
          Apply Default Styling
        </Button>
      </div>
    </div>
  );
};

/**
 * Custom extension for font size
 */
const FontSize = Extension.create({
  name: 'fontSize',

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize || null,
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {}
              }

              return {
                style: `font-size: ${attributes.fontSize}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
    }
  },
});

/**
 * CSS for styling the editor content
 */
const editorStyles = `
  .ProseMirror {
    padding: 1rem;
    min-height: 450px;
  }
  
  .ProseMirror:focus {
    outline: none;
  }
  
  .ProseMirror h1 {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }
  
  .ProseMirror h2 {
    font-size: 18px;
    font-weight: bold;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    border-bottom: 1px solid #ddd;
    padding-bottom: 0.25rem;
  }
  
  .ProseMirror h3 {
    font-size: 16px;
    font-weight: bold;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .ProseMirror p {
    margin-bottom: 0.5rem;
  }
  
  .ProseMirror ul, .ProseMirror ol {
    padding-left: 1.5rem;
    margin-bottom: 0.5rem;
  }
  
  .ProseMirror li {
    margin-bottom: 0.25rem;
  }
  
  .ProseMirror section {
    margin-bottom: 1.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px dotted #eee;
  }
  
  .ProseMirror section:last-child {
    border-bottom: none;
  }
  
  /* Special styling for resume sections */
  .ProseMirror section[id="resume-header"] h1 {
    font-size: 28px;
    color: #2c3e50;
  }
  
  .ProseMirror section[id="resume-summary"] {
    background-color: #f9f9f9;
    padding: 0.5rem;
    border-radius: 0.25rem;
  }
  
  .ProseMirror section[id="resume-experience"] h3 {
    color: #2980b9;
  }
  
  .ProseMirror section[id="resume-skills"] ul {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    list-style: none;
    padding-left: 0;
  }
  
  .ProseMirror section[id="resume-skills"] li {
    background-color: #e1f5fe;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
  }
`;

/**
 * TipTapResumeEditor Component
 */
const TipTapResumeEditor: React.FC<TipTapResumeEditorProps> = ({
  content,
  onChange,
  appliedKeywords = [],
  onApplyKeyword,
  suggestions = [],
  onApplySuggestion,
  readOnly = false,
}) => {
  // Local state for the content to avoid re-rendering issues
  const [localContent, setLocalContent] = useState(content);

  // Initialize the TipTap editor with extensions
  const editor = useEditor({
    extensions: [
      Document,
      Text,
      Paragraph,
      StarterKit.configure({
        document: false, // We use our custom document extension
      }),
      Heading.configure({
        levels: [1, 2, 3],
      }),
      TextStyle,
      FontSize,
      Color,
      FontFamily,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      SectionNode,
    ],
    content: localContent,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setLocalContent(html);
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose focus:outline-none max-w-none',
      },
    },
  });

  // Update the editor content when the prop changes
  useEffect(() => {
    if (editor && content !== localContent) {
      editor.commands.setContent(content);
      setLocalContent(content);
    }
  }, [content, editor, localContent]);

  // Helper to insert a keyword at the current position
  const insertKeyword = (keyword: string) => {
    if (editor) {
      editor
        .chain()
        .focus()
        .insertContent(`<span style="color: #3498db; background-color: #e1f5fe; padding: 2px 4px; border-radius: 2px;">${keyword}</span>`)
        .run();
      
      if (onApplyKeyword) {
        onApplyKeyword(keyword);
      }
    }
  };

  // Helper to apply a suggestion
  const applySuggestion = (suggestion: any) => {
    if (editor) {
      // Different handling based on suggestion type
      switch (suggestion.type) {
        case 'structure':
          // Might rearrange sections
          break;
        case 'content':
          // Insert at cursor position
          editor.chain().focus().insertContent(suggestion.text).run();
          break;
        case 'skills':
          // Try to find the skills section and append
          const dom = editor.view.dom;
          const skillsSection = dom.querySelector('section[id="resume-skills"]');
          
          if (skillsSection) {
            // Try to focus at the end of the skills section
            const pos = editor.state.doc.resolve(
              editor.state.doc.nodeSize - 2
            );
            editor.chain().setTextSelection(pos).run();
            editor.chain().focus().insertContent(suggestion.text).run();
          } else {
            // Just insert at current position
            editor.chain().focus().insertContent(suggestion.text).run();
          }
          break;
        default:
          // Default behavior: insert at cursor
          editor.chain().focus().insertContent(suggestion.text).run();
      }

      if (onApplySuggestion) {
        onApplySuggestion(suggestion);
      }
    }
  };

  // Editor content container style
  const editorClass = `border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
    readOnly ? 'cursor-not-allowed opacity-70' : ''
  }`;

  return (
    <div className="space-y-4">
      {/* Include editor styles */}
      <style jsx global>{editorStyles}</style>
      
      {/* Menu bar */}
      {!readOnly && <MenuBar editor={editor} />}

      {/* Editor content area */}
      <EditorContent 
        editor={editor} 
        className={editorClass}
      />

      {/* Keywords section if available */}
      {!readOnly && appliedKeywords && appliedKeywords.length > 0 && (
        <div className="mt-4 border rounded-lg p-3 bg-gray-50">
          <h3 className="text-sm font-medium mb-2">Applied Keywords</h3>
          <div className="flex flex-wrap gap-1">
            {appliedKeywords.map((keyword, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full cursor-pointer hover:bg-blue-200"
                onClick={() => insertKeyword(keyword)}
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions section if available */}
      {!readOnly && suggestions && suggestions.length > 0 && (
        <div className="mt-4 border rounded-lg p-3 bg-gray-50">
          <h3 className="text-sm font-medium mb-2">Available Suggestions</h3>
          <div className="space-y-2">
            {suggestions
              .filter(s => !s.isApplied)
              .map((suggestion, index) => (
                <div 
                  key={index} 
                  className="flex justify-between items-center p-2 bg-white rounded border hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium">{suggestion.text}</p>
                    <p className="text-xs text-gray-500">{suggestion.impact}</p>
                  </div>
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