/**
 * Editor Menu Bar Component (Simplified)
 * 
 * A toolbar for the TipTap editor with basic text formatting options.
 * Removed section management and drag-and-drop functionality for a more rigid structure.
 */
import React from 'react';
import { Editor } from '@tiptap/react';
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
  MoveVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

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

interface EditorMenuBarProps {
  editor: Editor | null;
}

/**
 * Menu bar component for the editor
 * Simplified version with only text formatting tools
 */
const EditorMenuBar: React.FC<EditorMenuBarProps> = ({ editor }) => {
  if (!editor) {
    return null;
  }

  /**
   * Apply default styling to the editor content
   */
  const applyDefaultStyling = () => {
    // Apply default styling to the entire document
    editor.chain()
      .focus()
      .setFontFamily('Arial, sans-serif')
      .run();
    
    // Find all section tags and add styling
    const dom = editor.view.dom;
    const sections = dom.querySelectorAll('[id^="resume-"], .section-title');
    
    sections.forEach(section => {
      // Style headings based on their level
      if (section.tagName === 'H1') {
        section.style.fontSize = '24px';
        section.style.fontWeight = 'bold';
      } else if (section.tagName === 'H2') {
        section.style.borderBottom = '1px solid #ddd';
        section.style.fontSize = '18px';
        section.style.fontWeight = 'bold';
        section.style.textTransform = 'uppercase';
      }
    });
    
    // Update content to reflect styling changes
    editor.commands.focus();
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
      
      {/* Apply styling button (simplified, no section management) */}
      <div className="flex justify-end p-1 bg-gray-50 rounded border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={applyDefaultStyling}
        >
          Apply Default Styling
        </Button>
      </div>
    </div>
  );
};

export default EditorMenuBar;