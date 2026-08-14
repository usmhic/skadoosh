"use client";
import { use, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/provider";
import { useLang } from "@/lib/lang-context";
import { BodyContent } from "@/components/body-content";
import { AccessControlFields, type AccessControlValue } from "@/components/studio/access-control-fields";
import { Button }   from "@skaddosh/ui/components/ui/button";
import { Input }    from "@skaddosh/ui/components/ui/input";
import { Separator } from "@skaddosh/ui/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@skaddosh/ui/components/ui/dialog";
import { cn } from "@skaddosh/ui/lib/utils";
import {
  ArrowLeftIcon, SaveIcon, EyeIcon, EyeOffIcon, LockIcon,
  BoldIcon, QuoteIcon, ImageIcon, CheckIcon, Loader2Icon, LoaderIcon,
} from "lucide-react";
import { SEED_WORKS } from "@skaddosh/db/seed-data";
import type { Lang } from "@skaddosh/db/schema";

const LANGS: { code: Lang; label: string }[] = [
  { code:"ar", label:"عربي" }, { code:"en", label:"EN" },
  { code:"fr", label:"FR" },   { code:"es", label:"ES" },
];
type BodyKey = "bodyAr" | "bodyEn" | "bodyFr" | "bodyEs";
const BODY_MAP: Record<Lang, BodyKey> = { ar:"bodyAr", en:"bodyEn", fr:"bodyFr", es:"bodyEs" };

export default function WorkEditorPage({ params }: { params: Promise<{ workId: string }> }) {
  const { workId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLang();

  const seed = SEED_WORKS.find(w => w.id === workId);
  const { data: mine } = trpc.works.mine.useQuery();
  const currentWork = mine?.find((w) => w.id === workId);
  const [active, setActive]   = useState<Lang>((searchParams.get("lang") as Lang | null) ?? lang);
  const [preview, setPreview] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [published, setPublished] = useState(seed?.published ?? false);
  const [wc,      setWc]      = useState(0);
  const [access, setAccess] = useState<AccessControlValue>({ visibility: "public", unlockMethod: "request", kudosPrice: 0 });
  const [accessOpen, setAccessOpen] = useState(false);

  const [titles, setTitles] = useState<Record<Lang,string>>({ ar: seed?.title.ar??"", en: seed?.title.en??"", fr: seed?.title.fr??"", es: seed?.title.es??"" });
  const [tags,   setTags]   = useState<Record<Lang,string>>({ ar: seed?.tag.ar??"",   en: seed?.tag.en??"",   fr: seed?.tag.fr??"",   es: seed?.tag.es??"" });
  const [bodies, setBodies] = useState<Record<Lang,string>>({ ar: seed?.bodyAr??"",   en: seed?.bodyEn??"",   fr: (seed as { bodyFr?: string } | undefined)?.bodyFr??"",   es: (seed as { bodyEs?: string } | undefined)?.bodyEs??"" });

  const edRtl  = active === "ar";
  const accent = seed?.accentColor ?? "#6366f1";

  useEffect(() => { setWc(bodies[active].trim().split(/\s+/).filter(Boolean).length); }, [bodies, active]);
  useEffect(() => {
    const requested = searchParams.get("lang") as Lang | null;
    setActive(requested && BODY_MAP[requested] ? requested : lang);
  }, [lang, searchParams]);
  useEffect(() => {
    if (!currentWork) return;
    setTitles({
      ar: currentWork.title.ar ?? "",
      en: currentWork.title.en ?? "",
      fr: currentWork.title.fr ?? "",
      es: currentWork.title.es ?? "",
    });
    setTags({
      ar: currentWork.tag.ar ?? "",
      en: currentWork.tag.en ?? "",
      fr: currentWork.tag.fr ?? "",
      es: currentWork.tag.es ?? "",
    });
    setBodies({
      ar: currentWork.bodyAr ?? "",
      en: currentWork.bodyEn ?? "",
      fr: currentWork.bodyFr ?? "",
      es: currentWork.bodyEs ?? "",
    });
    setPublished(currentWork.published);
    setAccess({
      visibility: currentWork.visibility,
      unlockMethod: currentWork.unlockMethod,
      kudosPrice: currentWork.kudosPrice,
    });
  }, [currentWork]);

  const insertAround = useCallback((wrap: string) => {
    const ta = document.getElementById("editor") as HTMLTextAreaElement;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    setBodies(b => ({ ...b, [active]: ta.value.slice(0,s) + wrap + ta.value.slice(s,e) + wrap + ta.value.slice(e) }));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(s+wrap.length, e+wrap.length); }, 0);
  }, [active]);

  const insertPrefix = useCallback((prefix: string) => {
    const ta = document.getElementById("editor") as HTMLTextAreaElement;
    if (!ta) return;
    const ls = ta.value.lastIndexOf("\n", ta.selectionStart - 1) + 1;
    setBodies(b => ({ ...b, [active]: ta.value.slice(0,ls) + prefix + ta.value.slice(ls) }));
  }, [active]);

  const insertBlock = useCallback((block: string) => {
    const ta = document.getElementById("editor") as HTMLTextAreaElement;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const before = ta.value.slice(0, s);
    const after = ta.value.slice(e);
    const lead = before.length === 0 || before.endsWith("\n\n") ? "" : (before.endsWith("\n") ? "\n" : "\n\n");
    const trail = after.length === 0 || after.startsWith("\n\n") ? "" : (after.startsWith("\n") ? "\n" : "\n\n");
    const insertion = lead + block + trail;
    setBodies(b => ({ ...b, [active]: before + insertion + after }));
    setTimeout(() => {
      ta.focus();
      const pos = before.length + insertion.length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  }, [active]);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  async function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setImageError("Only images are supported.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageError("Max 10 MB.");
      return;
    }
    setImageError(null);
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "works");
      const res = await fetch("/api/uploads/images", { method: "POST", body: fd });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      insertBlock(`![](${data.url})`);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingImage(false);
    }
  }

  const update = trpc.works.update.useMutation({
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2500); },
  });

  async function save() {
    setSaving(true);
    await update.mutateAsync({
      id: workId,
      titleAr: titles.ar, titleEn: titles.en, titleFr: titles.fr, titleEs: titles.es,
      tagAr:   tags.ar,   tagEn:   tags.en,   tagFr:   tags.fr,   tagEs:   tags.es,
      bodyAr:  bodies.ar, bodyEn:  bodies.en, bodyFr:  bodies.fr, bodyEs:  bodies.es,
      published,
      visibility: access.visibility,
      unlockMethod: access.unlockMethod,
      kudosPrice: access.kudosPrice,
    });
    setSaving(false);
  }

  async function saveWithPublished(nextPublished: boolean) {
    setPublished(nextPublished);
    setSaving(true);
    await update.mutateAsync({
      id: workId,
      titleAr: titles.ar, titleEn: titles.en, titleFr: titles.fr, titleEs: titles.es,
      tagAr: tags.ar, tagEn: tags.en, tagFr: tags.fr, tagEs: tags.es,
      bodyAr: bodies.ar, bodyEn: bodies.en, bodyFr: bodies.fr, bodyEs: bodies.es,
      published: nextPublished,
      visibility: access.visibility,
      unlockMethod: access.unlockMethod,
      kudosPrice: access.kudosPrice,
    });
    setSaving(false);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5">
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={() => router.push("/studio")}>
          <ArrowLeftIcon className="size-4" />
        </Button>

        <Input
          value={titles[active]}
          onChange={e => setTitles(t => ({...t,[active]:e.target.value}))}
          dir={edRtl ? "rtl" : "ltr"}
          placeholder={edRtl ? "عنوان العمل..." : "Work title..."}
          className={cn("flex-1 border-transparent shadow-none focus-visible:ring-0 bg-transparent px-2 text-base font-semibold",
            edRtl ? "font-arabic text-right" : "font-display italic")}
        />

        <div className="hidden items-center gap-2 sm:flex">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAccessOpen(true)}
            className={cn(access.visibility === "confidential" && "border-primary text-primary")}
          >
            <LockIcon className="size-3.5 mr-1.5" />
            {access.visibility === "confidential" ? "Confidential" : "Access"}
          </Button>
          <Button
            variant={published ? "outline" : "default"}
            size="sm"
            onClick={() => saveWithPublished(!published)}
            disabled={saving || update.isPending}
          >
            {published ? <EyeOffIcon className="size-3.5 mr-1.5" /> : <EyeIcon className="size-3.5 mr-1.5" />}
            {published ? "Unpublish" : "Publish"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPreview(p => !p)} className={cn(preview && "bg-muted")}>
            {preview ? <EyeOffIcon className="size-3.5 mr-1.5" /> : <EyeIcon className="size-3.5 mr-1.5" />}
            {preview ? "Edit" : "Preview"}
          </Button>
          <Button size="sm" onClick={save} disabled={saving || update.isPending}
            className={cn(saved && "bg-green-600 hover:bg-green-600")}>
            {saving || update.isPending ? <LoaderIcon className="size-3.5 mr-1.5 animate-spin" /> :
             saved ? <CheckIcon className="size-3.5 mr-1.5" /> : <SaveIcon className="size-3.5 mr-1.5" />}
            {saved ? "Saved" : "Save"}
          </Button>
        </div>
      </div>

      {/* Lang tabs */}
      <div className="flex shrink-0 items-center gap-0.5 border-b border-border bg-muted/30 px-4 py-1.5">
        {LANGS.map(({ code, label }) => (
          <button key={code} onClick={() => setActive(code)}
            className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
              code==="ar" ? "font-arabic" : "font-mono",
              active===code ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {label}
            <span className={cn("size-1.5 rounded-full", bodies[code].trim().length > 0 ? "bg-green-500" : "bg-muted-foreground/30")} />
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3">
          <span className="font-mono text-[0.6rem] text-muted-foreground tabular-nums">{wc} words</span>
          {/* Tag input */}
          <Input
            value={tags[active]}
            onChange={e => setTags(t => ({...t,[active]:e.target.value}))}
            dir={edRtl ? "rtl" : "ltr"}
            placeholder={edRtl ? "الوسم..." : "Tag..."}
            className={cn("h-7 w-32 border-border bg-muted/40 text-xs sm:w-44",
              edRtl ? "font-arabic text-right" : "font-mono")}
          />
        </div>
      </div>

      {/* Editor / Preview */}
      {preview ? (
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl px-6 py-8 sm:px-12">
            <h1 className={cn("mb-8 text-3xl font-bold text-foreground", edRtl ? "font-arabic text-right" : "font-display")} dir={edRtl?"rtl":"ltr"}>
              {titles[active] || (edRtl ? "بدون عنوان" : "Untitled")}
            </h1>
            {bodies[active] ? <BodyContent text={bodies[active]} lang={active} accent={accent} /> :
              <p className="text-muted-foreground italic">{edRtl ? "لا يوجد محتوى بعد." : "Nothing written yet."}</p>}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex shrink-0 items-center gap-1 border-b border-border/60 px-4 py-2">
            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={() => insertAround("*")} title="Bold/italic marker">
              <BoldIcon className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={() => insertPrefix("— ")} title="Dialogue">
              <QuoteIcon className="size-4" />
            </Button>
            <Separator orientation="vertical" className="mx-1 h-5" />
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploadingImage}
              title="Insert image"
            >
              {uploadingImage ? <Loader2Icon className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
            </Button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageFile(f);
                e.target.value = "";
              }}
            />
            {imageError ? <span className="ml-1 text-xs text-destructive">{imageError}</span> : null}
          </div>
          <textarea
            id="editor"
            value={bodies[active]}
            onChange={e => setBodies(b => ({...b,[active]:e.target.value}))}
            dir={edRtl ? "rtl" : "ltr"}
            lang={active}
            spellCheck
            placeholder={edRtl
              ? "اكتب هنا...\n\nسطر فارغ = فقرة\n— للحوار\n*نص بارز*\nأدرج صورة من الشريط أعلاه"
              : "Write here...\n\nBlank line = paragraph\n— for dialogue\n*highlighted text*\nUse the toolbar to insert an image"}
            className={cn(
              "flex-1 resize-none bg-background px-6 py-6 text-foreground outline-none",
              "placeholder:text-muted-foreground/40 sm:px-12",
              edRtl
                ? "font-arabic text-right text-[1.15rem] leading-[2.2]"
                : "font-display text-[1.05rem] leading-[1.9]"
            )}
          />
        </div>
      )}

      {/* Mobile bottom bar */}
      <div className="flex shrink-0 items-center justify-between border-t border-border px-4 py-3 sm:hidden">
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setAccessOpen(true)} className={cn(access.visibility === "confidential" && "border-primary text-primary")}>
            <LockIcon className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPreview(p => !p)}>
            {preview ? <EyeOffIcon className="size-4 mr-1.5" /> : <EyeIcon className="size-4 mr-1.5" />}
            {preview ? "Edit" : "Preview"}
          </Button>
          <Button variant={published ? "outline" : "default"} size="sm" onClick={() => saveWithPublished(!published)} disabled={saving}>
            {published ? "Unpublish" : "Publish"}
          </Button>
        </div>
        <Button size="sm" onClick={save} disabled={saving} className={cn(saved && "bg-green-600 hover:bg-green-600")}>
          {saving ? <LoaderIcon className="size-4 mr-1.5 animate-spin" /> : saved ? <CheckIcon className="size-4 mr-1.5" /> : <SaveIcon className="size-4 mr-1.5" />}
          {saved ? "Saved" : "Save"}
        </Button>
      </div>

      <Dialog open={accessOpen} onOpenChange={setAccessOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Access & pricing</DialogTitle>
          </DialogHeader>
          <AccessControlFields value={access} onChange={setAccess} />
          <Button size="sm" onClick={() => setAccessOpen(false)}>Done</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
