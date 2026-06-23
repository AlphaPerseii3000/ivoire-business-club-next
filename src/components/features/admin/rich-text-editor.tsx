"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Markdown } from "@tiptap/markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Code,
  Minus,
  Image as ImageIcon,
  Loader2,
  Type,
  Check,
} from "lucide-react";

type RichTextEditorProps = {
  value: string;
  onChange: (markdown: string) => void;
  "data-testid"?: string;
  onInlineImageUpload?: (file: File) => Promise<{ url: string; alt: string } | null>;
};

const HEADING_LEVELS = [
  { label: "Titre 1", value: 1, icon: Heading1 },
  { label: "Titre 2", value: 2, icon: Heading2 },
  { label: "Titre 3", value: 3, icon: Heading3 },
  { label: "Titre 4", value: 4, icon: Heading4 },
] as const;

function ToolbarButton({
  active,
  onClick,
  title,
  children,
  disabled,
  "data-testid": dataTestid,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
  "data-testid"?: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-xs"
      className="shrink-0"
      onClick={onClick}
      title={title}
      disabled={disabled}
      data-testid={dataTestid}
    >
      {children}
    </Button>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  "data-testid": dataTestid,
  onInlineImageUpload,
}: RichTextEditorProps) {
  const [isClient, setIsClient] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [isUploadingInline, setIsUploadingInline] = useState(false);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleUpdate = useCallback(
    ({ editor }: { editor: NonNullable<ReturnType<typeof useEditor> & { getMarkdown: () => string }> }) => {
      onChange(editor.getMarkdown());
    },
    [onChange]
  );

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3, 4] },
          link: {
            openOnClick: false,
            autolink: true,
            defaultProtocol: "https",
          },
        }),
        Image.configure({
          allowBase64: false,
        }),
        Markdown,
      ],
      content: value,
      contentType: "markdown",
      editorProps: {
        attributes: {
          class:
            "prose dark:prose-invert prose-sm sm:prose-base max-w-none min-h-[20rem] p-4 outline-none",
        },
      },
      onUpdate: handleUpdate,
      onSelectionUpdate: handleUpdate,
    },
    []
  );

  // Sync external value changes into the editor when not focused
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (editor.isFocused) return;
    const current = editor.getMarkdown();
    if (current !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  // Focus link input when shown
  useEffect(() => {
    if (showLinkInput) {
      setTimeout(() => linkInputRef.current?.focus(), 0);
    }
  }, [showLinkInput]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    setLinkUrl(previousUrl ?? "");
    setShowLinkInput(true);
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    const url = linkUrl.trim();
    if (url === "") {
      editor.chain().focus().unsetLink().run();
    } else {
      const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      editor.chain().focus().setLink({ href }).run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  const cancelLink = useCallback(() => {
    setShowLinkInput(false);
    setLinkUrl("");
  }, []);

  const handleInlineUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor || !onInlineImageUpload) return;

      setIsUploadingInline(true);
      try {
        const result = await onInlineImageUpload(file);
        if (result) {
          editor.chain().focus().setImage({ src: result.url, alt: result.alt }).run();
        }
      } catch {
        // Error handling is delegated to the parent (toast)
      } finally {
        setIsUploadingInline(false);
        if (inlineInputRef.current) inlineInputRef.current.value = "";
      }
    },
    [editor, onInlineImageUpload]
  );

  if (!isClient || !editor) {
    return (
      <div
        data-testid={dataTestid}
        className="border rounded-md bg-muted/20 min-h-[20rem] animate-pulse"
      />
    );
  }

  const activeHeadingLevel = HEADING_LEVELS.find((h) => editor.isActive("heading", { level: h.value }));

  return (
    <div data-testid={dataTestid} className="border rounded-md overflow-hidden bg-background">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 p-2 border-b bg-muted/50">
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            active={editor.isActive("paragraph")}
            onClick={() => editor.chain().focus().setParagraph().run()}
            title="Paragraphe"
            data-testid="tiptap-paragraph-btn"
          >
            <Type className="h-3.5 w-3.5" />
          </ToolbarButton>
          {HEADING_LEVELS.map((level) => (
            <ToolbarButton
              key={level.value}
              active={editor.isActive("heading", { level: level.value })}
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .toggleHeading({ level: level.value as 1 | 2 | 3 | 4 })
                  .run()
              }
              title={level.label}
              data-testid={`tiptap-heading-${level.value}-btn`}
            >
              <level.icon className="h-3.5 w-3.5" />
            </ToolbarButton>
          ))}
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        <div className="flex items-center gap-0.5">
          <ToolbarButton
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Gras (Ctrl+B)"
            data-testid="markdown-bold-btn"
          >
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italique (Ctrl+I)"
            data-testid="tiptap-italic-btn"
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Liste à puces"
            data-testid="tiptap-bullet-list-btn"
          >
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Liste numérotée"
            data-testid="tiptap-ordered-list-btn"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Citation"
            data-testid="tiptap-blockquote-btn"
          >
            <Quote className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("code")}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Code inline"
            data-testid="tiptap-inline-code-btn"
          >
            <Code className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={false}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Séparateur horizontal"
            data-testid="tiptap-horizontal-rule-btn"
          >
            <Minus className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("link")}
            onClick={setLink}
            title="Lien"
            data-testid="tiptap-link-btn"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          {onInlineImageUpload ? (
            <ToolbarButton
              active={false}
              onClick={() => inlineInputRef.current?.click()}
              title="Insérer une image en ligne"
              disabled={isUploadingInline}
              data-testid="tiptap-inline-image-btn"
            >
              {isUploadingInline ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImageIcon className="h-3.5 w-3.5" />
              )}
            </ToolbarButton>
          ) : null}
        </div>

        <input
          type="file"
          ref={inlineInputRef}
          onChange={handleInlineUpload}
          accept="image/*"
          className="hidden"
        />
      </div>

      {showLinkInput ? (
        <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
          <Label htmlFor="tiptap-link-url" className="sr-only">
            URL du lien
          </Label>
          <Input
            id="tiptap-link-url"
            ref={linkInputRef}
            type="text"
            placeholder="https://exemple.com"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              } else if (e.key === "Escape") {
                cancelLink();
              }
            }}
            className="h-8 text-sm"
          />
          <Button type="button" size="sm" onClick={applyLink}>
            <Check className="h-3.5 w-3.5 mr-1" />
            OK
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={cancelLink}>
            Annuler
          </Button>
        </div>
      ) : null}

      <EditorContent editor={editor} className="editor-content" />

      {activeHeadingLevel ? (
        <div className="px-3 py-1 text-xs text-muted-foreground border-t">
          {activeHeadingLevel.label}
        </div>
      ) : null}
    </div>
  );
}