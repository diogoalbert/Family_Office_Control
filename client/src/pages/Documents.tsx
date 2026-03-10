import { trpc } from "@/lib/trpc";
import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  FileIcon,
  Loader2,
} from "lucide-react";

const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return FileIcon;
  if (mimeType.includes("pdf")) return FileText;
  return FileIcon;
}

export default function Documents() {
  const utils = trpc.useUtils();
  const { data: documents = [], isLoading } = trpc.documents.list.useQuery();
  const uploadMutation = trpc.documents.upload.useMutation({
    onSuccess: () => {
      utils.documents.list.invalidate();
      toast.success("Document uploaded successfully!");
      setUploading(false);
      setUploadProgress(0);
    },
    onError: (err) => {
      toast.error("Error uploading document: " + err.message);
      setUploading(false);
      setUploadProgress(0);
    },
  });
  const processDocuments = trpc.documents.processDocuments.useMutation({
    onSuccess: (result) => {
      utils.documents.list.invalidate();
      toast.success(`${result.processed} document(s) processed for AI chat`);
    },
    onError: () => toast.error("Error processing documents"),
  });
  const deleteDoc = trpc.documents.delete.useMutation({
    onSuccess: () => { utils.documents.list.invalidate(); toast.success("Document removed!"); },
    onError: () => toast.error("Error removing document"),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.size > FILE_SIZE_LIMIT) {
        toast.error(`${file.name}: file is too large (max 10MB)`);
        continue;
      }

      setUploading(true);
      setUploadProgress(10);

      try {
        // Read file as base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]); // Remove data URL prefix
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        setUploadProgress(50);

        await uploadMutation.mutateAsync({
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
          fileData: base64,
          uploaderName: undefined,
        });

        setUploadProgress(100);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const unprocessed = documents.filter((d) => !d.processed).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            Document Repository
          </h1>
          <p className="text-muted-foreground mt-1">
            Upload opinions and research documents. Files are processed automatically for AI Chat.
          </p>
        </div>
        {unprocessed > 0 && (
          <Button
            onClick={() => processDocuments.mutate()}
            disabled={processDocuments.isPending}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {processDocuments.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Process {unprocessed} document(s)
          </Button>
        )}
      </div>

      {/* Proton Drive Notice */}
      <Card className="bg-amber-500/5 border-amber-500/30">
        <CardContent className="p-3 flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-400">Proton Drive Sync</p>
            <p className="text-xs text-muted-foreground mt-1">
              Documents are stored in the cloud and accessible from anywhere. To sync with Proton Drive, install the official Proton Drive client on the server and configure sync with the uploads folder.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-primary/5"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.md"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
            {uploading ? (
              <div className="space-y-3">
                <Loader2 className="w-10 h-10 text-primary mx-auto animate-spin" />
                <p className="text-sm font-medium text-foreground">Uploading document...</p>
                <Progress value={uploadProgress} className="max-w-xs mx-auto h-1.5" />
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Drag files here or click to select</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, TXT, MD · Maximum 10MB per file</p>
                </div>
                <Button variant="outline" size="sm" className="border-border hover:border-primary/40">
                  <Upload className="w-4 h-4 mr-2" />
                  Select Files
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: documents.length, color: "text-primary", icon: FileText },
          { label: "Processed (IA)", value: documents.filter((d) => d.processed).length, color: "text-emerald-400", icon: CheckCircle2 },
          { label: "Waiting", value: unprocessed, color: "text-amber-400", icon: Clock },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-3 flex items-center gap-2.5">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Documents List */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm font-semibold text-foreground">Uploaded Documents</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2">
              <FileText className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {documents.map((doc) => {
                const Icon = getFileIcon(doc.mimeType);
                return (
                  <div key={doc.id} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/20 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.originalName}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {doc.fileSize ? formatBytes(doc.fileSize) : "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{doc.uploaderName ?? "—"}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(doc.createdAt).toLocaleDateString("en-US")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={
                          doc.processed
                            ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                            : doc.processingError
                            ? "text-red-400 border-red-500/30 bg-red-500/10"
                            : "text-amber-400 border-amber-500/30 bg-amber-500/10"
                        }
                      >
                        {doc.processed ? (
                          <><CheckCircle2 className="w-3 h-3 mr-1" /> Processed</>
                        ) : doc.processingError ? (
                          <><AlertCircle className="w-3 h-3 mr-1" /> Error</>
                        ) : (
                          <><Clock className="w-3 h-3 mr-1" /> Pending</>
                        )}
                      </Badge>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => deleteDoc.mutate({ id: doc.id })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
