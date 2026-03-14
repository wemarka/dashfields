import { useState, useCallback, useRef } from "react";
import { trpc } from "@/core/lib/trpc";
import { useAuth } from "@/shared/hooks/useAuth";
import {
  Search, Upload, Grid3X3, List, FolderOpen, Tag, Trash2, X,
  Image as ImageIcon, Film, FileText, Download, Eye, Plus, Check,
  ChevronDown, Loader2
} from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Badge } from "@/core/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/core/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/core/components/ui/dialog";
import { toast } from "sonner";

/* ─── helpers ─────────────────────────────────────────────────────────── */
function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getMimeIcon(mime: string) {
  if (mime.startsWith("image/")) return <ImageIcon className="w-5 h-5 text-muted-foreground" />;
  if (mime.startsWith("video/")) return <Film className="w-5 h-5 text-brand" />;
  return <FileText className="w-5 h-5 text-neutral-400" />;
}

function parseTags(tags: any): string[] {
  try {
    if (typeof tags === "string") return JSON.parse(tags);
    if (Array.isArray(tags)) return tags;
  } catch { /* ignore */ }
  return [];
}

/* ─── component ───────────────────────────────────────────────────────── */
export default function AssetsPage() {
  const { user } = useAuth();


  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [activeFolder, setActiveFolder] = useState("All");
  const [mimeFilter, setMimeFilter] = useState<string | undefined>();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [lightboxAsset, setLightboxAsset] = useState<any | null>(null);
  const [tagDialogAsset, setTagDialogAsset] = useState<any | null>(null);
  const [newTag, setNewTag] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const assetsQuery = trpc.assets.list.useQuery({
    search: search || undefined,
    folder: activeFolder !== "All" ? activeFolder : undefined,
    mimeType: mimeFilter,
    limit: 100,
    offset: 0,
  });
  const foldersQuery = trpc.assets.folders.useQuery();
  const utils = trpc.useUtils();

  // Mutations
  const uploadMut = trpc.assets.upload.useMutation({
    onSuccess: () => { utils.assets.list.invalidate(); utils.assets.folders.invalidate(); },
  });
  const deleteMut = trpc.assets.delete.useMutation({
    onSuccess: () => {
      utils.assets.list.invalidate();
      setSelectedIds([]);
      toast.success("Assets removed successfully.");
    },
  });
  const updateMut = trpc.assets.update.useMutation({
    onSuccess: () => { utils.assets.list.invalidate(); },
  });

  const items = assetsQuery.data?.items ?? [];
  const total = assetsQuery.data?.total ?? 0;
  const folders = foldersQuery.data ?? [];

  /* ─── Upload handler ─────────────────────────────────────────────── */
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    setUploadingCount(fileArr.length);

    for (const file of fileArr) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        let width: number | undefined;
        let height: number | undefined;
        if (file.type.startsWith("image/")) {
          const dims = await new Promise<{ w: number; h: number }>((resolve) => {
            const img = new window.Image();
            img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
            img.onerror = () => resolve({ w: 0, h: 0 });
            img.src = URL.createObjectURL(file);
          });
          width = dims.w || undefined;
          height = dims.h || undefined;
        }

        await uploadMut.mutateAsync({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          base64Data: base64,
          size: file.size,
          width,
          height,
          folder: activeFolder !== "All" ? activeFolder : "Uncategorized",
        });
      } catch (err: any) {
        toast.error(err.message || "Upload failed");
      }
    }
    setUploadingCount(0);
    toast.success(`${fileArr.length} file(s) uploaded.`);
  }, [uploadMut, activeFolder, toast]);

  /* ─── Drag & Drop ────────────────────────────────────────────────── */
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback(() => setIsDragging(false), []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  /* ─── Selection ──────────────────────────────────────────────────── */
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const selectAll = () => {
    if (selectedIds.length === items.length) setSelectedIds([]);
    else setSelectedIds(items.map((i: any) => i.id));
  };

  /* ─── Tags ───────────────────────────────────────────────────────── */
  const addTag = () => {
    if (!newTag.trim() || !tagDialogAsset) return;
    const currentTags = parseTags(tagDialogAsset.tags);
    if (currentTags.includes(newTag.trim())) return;
    updateMut.mutate({ id: tagDialogAsset.id, tags: [...currentTags, newTag.trim()] });
    setTagDialogAsset({ ...tagDialogAsset, tags: [...currentTags, newTag.trim()] });
    setNewTag("");
  };
  const removeTag = (tag: string) => {
    if (!tagDialogAsset) return;
    const currentTags = parseTags(tagDialogAsset.tags);
    const updated = currentTags.filter((t: string) => t !== tag);
    updateMut.mutate({ id: tagDialogAsset.id, tags: updated });
    setTagDialogAsset({ ...tagDialogAsset, tags: updated });
  };

  const mimeOptions = [
    { label: "All Types", value: undefined },
    { label: "Images", value: "image/" },
    { label: "Videos", value: "video/" },
    { label: "Documents", value: "application/" },
  ];

  return (
    <div
      className="w-full min-h-[calc(100vh-4rem)] px-4 sm:px-6 lg:px-8 py-6"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Media Library</h1>
          <p className="text-neutral-400 text-sm mt-1">
            {total} asset{total !== 1 ? "s" : ""} in your library
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx"
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="bg-[#E62020]/14 hover:bg-[#E62020]/14 text-white"
            disabled={uploadingCount > 0}
          >
            {uploadingCount > 0 ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading ({uploadingCount})</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Upload</>
            )}
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <Input
            placeholder="Search by name or tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="bg-neutral-900 border-neutral-700 text-white hover:bg-neutral-800">
              <FolderOpen className="w-4 h-4 mr-2" />
              {activeFolder}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-neutral-900 border-neutral-700">
            <DropdownMenuItem onClick={() => setActiveFolder("All")} className="text-white hover:bg-neutral-800">
              All Folders
            </DropdownMenuItem>
            {folders.map((f: string) => (
              <DropdownMenuItem key={f} onClick={() => setActiveFolder(f)} className="text-white hover:bg-neutral-800">
                {f}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="bg-neutral-900 border-neutral-700 text-white hover:bg-neutral-800">
              {mimeOptions.find((o) => o.value === mimeFilter)?.label ?? "All Types"}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-neutral-900 border-neutral-700">
            {mimeOptions.map((o) => (
              <DropdownMenuItem key={o.label} onClick={() => setMimeFilter(o.value)} className="text-white hover:bg-neutral-800">
                {o.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded ${viewMode === "grid" ? "bg-neutral-700 text-white" : "text-neutral-400 hover:text-white"}`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded ${viewMode === "list" ? "bg-neutral-700 text-white" : "text-neutral-400 hover:text-white"}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-400">{selectedIds.length} selected</span>
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="bg-neutral-900 border-neutral-700 text-white hover:bg-neutral-800"
            >
              {selectedIds.length === items.length ? "Deselect All" : "Select All"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => deleteMut.mutate({ ids: selectedIds })}
              className="bg-[#E62020]/14 border-red-600/50 text-[#f87171] hover:bg-[#E62020]/14"
            >
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          </div>
        )}
      </div>

      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-dashed border-red-500 rounded-2xl p-16 text-center">
            <Upload className="w-12 h-12 text-[#f87171] mx-auto mb-4" />
            <p className="text-xl font-semibold text-white">Drop files to upload</p>
            <p className="text-neutral-400 mt-1">Images, videos, and documents</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!assetsQuery.isLoading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-6">
            <ImageIcon className="w-10 h-10 text-neutral-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No assets yet</h3>
          <p className="text-neutral-400 mb-6 max-w-sm">
            Upload images, videos, and documents to build your media library. Drag and drop or click the upload button.
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="bg-[#E62020]/14 hover:bg-[#E62020]/14 text-white"
          >
            <Upload className="w-4 h-4 mr-2" /> Upload Your First Asset
          </Button>
        </div>
      )}

      {/* Loading */}
      {assetsQuery.isLoading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
        </div>
      )}

      {/* Grid View */}
      {!assetsQuery.isLoading && items.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map((asset: any) => {
            const isSelected = selectedIds.includes(asset.id);
            const tags = parseTags(asset.tags);
            return (
              <div
                key={asset.id}
                className={`group relative rounded-xl overflow-hidden border transition-all cursor-pointer ${
                  isSelected
                    ? "border-red-500 ring-2 ring-red-500/30"
                    : "border-neutral-800 hover:border-neutral-600"
                } bg-neutral-900`}
              >
                <div
                  className="aspect-square bg-neutral-800 flex items-center justify-center overflow-hidden"
                  onClick={() => {
                    if (asset.mime_type?.startsWith("image/")) setLightboxAsset(asset);
                  }}
                >
                  {asset.mime_type?.startsWith("image/") ? (
                    <img src={asset.url} alt={asset.file_name} className="w-full h-full object-cover" />
                  ) : asset.mime_type?.startsWith("video/") ? (
                    <Film className="w-10 h-10 text-neutral-500" />
                  ) : (
                    <FileText className="w-10 h-10 text-neutral-500" />
                  )}
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); toggleSelect(asset.id); }}
                  className={`absolute top-2 left-2 w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-[#E62020]/14 border-red-600 text-white"
                      : "bg-neutral-900/80 border-neutral-600 text-transparent group-hover:text-neutral-400"
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>

                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {asset.mime_type?.startsWith("image/") && (
                    <button
                      onClick={() => setLightboxAsset(asset)}
                      className="w-7 h-7 rounded-md bg-neutral-900/80 border border-neutral-700 flex items-center justify-center text-white hover:bg-neutral-800"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setTagDialogAsset(asset)}
                    className="w-7 h-7 rounded-md bg-neutral-900/80 border border-neutral-700 flex items-center justify-center text-white hover:bg-neutral-800"
                  >
                    <Tag className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 rounded-md bg-neutral-900/80 border border-neutral-700 flex items-center justify-center text-white hover:bg-neutral-800"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="p-2.5">
                  <p className="text-xs font-medium text-white truncate">{asset.file_name}</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    {formatBytes(Number(asset.size))}
                    {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ""}
                  </p>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {tags.slice(0, 2).map((t: string) => (
                        <Badge key={t} variant="secondary" className="text-[9px] px-1.5 py-0 bg-neutral-800 text-neutral-300 border-0">
                          {t}
                        </Badge>
                      ))}
                      {tags.length > 2 && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-neutral-800 text-neutral-400 border-0">
                          +{tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {!assetsQuery.isLoading && items.length > 0 && viewMode === "list" && (
        <div className="border border-neutral-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-900 border-b border-neutral-800">
                <th className="w-10 px-4 py-3">
                  <button onClick={selectAll} className="text-neutral-400 hover:text-white">
                    <Check className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-left text-xs font-medium text-neutral-400 uppercase tracking-wider px-4 py-3">File</th>
                <th className="text-left text-xs font-medium text-neutral-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Type</th>
                <th className="text-left text-xs font-medium text-neutral-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Size</th>
                <th className="text-left text-xs font-medium text-neutral-400 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Tags</th>
                <th className="text-left text-xs font-medium text-neutral-400 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Folder</th>
                <th className="w-20 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((asset: any) => {
                const isSelected = selectedIds.includes(asset.id);
                const tags = parseTags(asset.tags);
                return (
                  <tr
                    key={asset.id}
                    className={`border-b border-neutral-800/50 transition-colors ${
                      isSelected ? "bg-[#E62020]/14" : "hover:bg-neutral-900/50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleSelect(asset.id)}
                        className={`w-5 h-5 rounded border flex items-center justify-center ${
                          isSelected ? "bg-[#E62020]/14 border-red-600 text-white" : "border-neutral-600 text-transparent hover:border-neutral-400"
                        }`}
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-neutral-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {asset.mime_type?.startsWith("image/") ? (
                            <img src={asset.url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            getMimeIcon(asset.mime_type || "")
                          )}
                        </div>
                        <span className="text-sm text-white truncate max-w-[200px]">{asset.file_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-neutral-400">{asset.mime_type?.split("/")[1]?.toUpperCase() || "—"}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-neutral-400">{formatBytes(Number(asset.size))}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex gap-1">
                        {tags.slice(0, 3).map((t: string) => (
                          <Badge key={t} variant="secondary" className="text-[10px] bg-neutral-800 text-neutral-300 border-0">{t}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-neutral-400">{asset.folder}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setTagDialogAsset(asset)} className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white">
                          <Tag className="w-3.5 h-3.5" />
                        </button>
                        <a href={asset.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white">
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={!!lightboxAsset} onOpenChange={() => setLightboxAsset(null)}>
        <DialogContent className="max-w-4xl bg-neutral-900 border-neutral-700 p-0 overflow-hidden">
          {lightboxAsset && (
            <>
              <div className="bg-neutral-950 flex items-center justify-center min-h-[400px] max-h-[70vh]">
                <img
                  src={lightboxAsset.url}
                  alt={lightboxAsset.file_name}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              </div>
              <div className="p-4 border-t border-neutral-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{lightboxAsset.file_name}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {formatBytes(Number(lightboxAsset.size))}
                      {lightboxAsset.width && lightboxAsset.height ? ` · ${lightboxAsset.width}×${lightboxAsset.height}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setTagDialogAsset(lightboxAsset); setLightboxAsset(null); }}
                      className="bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700"
                    >
                      <Tag className="w-3.5 h-3.5 mr-1" /> Tags
                    </Button>
                    <a href={lightboxAsset.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700">
                        <Download className="w-3.5 h-3.5 mr-1" /> Download
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Tag Management Dialog */}
      <Dialog open={!!tagDialogAsset} onOpenChange={() => setTagDialogAsset(null)}>
        <DialogContent className="bg-neutral-900 border-neutral-700">
          <DialogHeader>
            <DialogTitle className="text-white">Manage Tags</DialogTitle>
          </DialogHeader>
          {tagDialogAsset && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-400 truncate">{tagDialogAsset.file_name}</p>
              <div className="flex flex-wrap gap-2">
                {parseTags(tagDialogAsset.tags).map((tag: string) => (
                  <Badge
                    key={tag}
                    className="bg-neutral-800 text-neutral-200 border-neutral-700 pr-1 flex items-center gap-1"
                  >
                    {tag}
                    <button onClick={() => removeTag(tag)} className="ml-1 hover:text-[#f87171]">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {parseTags(tagDialogAsset.tags).length === 0 && (
                  <p className="text-xs text-neutral-500">No tags yet</p>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTag()}
                  className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
                />
                <Button onClick={addTag} className="bg-[#E62020]/14 hover:bg-[#E62020]/14 text-white">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
