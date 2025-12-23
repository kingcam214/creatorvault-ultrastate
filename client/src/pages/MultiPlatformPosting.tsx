import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Upload, Trash2 } from "lucide-react";

const PLATFORMS = [
  { id: "tiktok", name: "TikTok", color: "bg-black" },
  { id: "instagram", name: "Instagram", color: "bg-gradient-to-br from-purple-600 to-pink-500" },
  { id: "youtube", name: "YouTube", color: "bg-red-600" },
  { id: "twitter", name: "Twitter/X", color: "bg-blue-500" },
  { id: "facebook", name: "Facebook", color: "bg-blue-700" },
] as const;

const CONTENT_TYPES = [
  { value: "text", label: "Text Post" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "reel", label: "Reel/Short" },
  { value: "carousel", label: "Carousel" },
  { value: "story", label: "Story" },
] as const;

export function MultiPlatformPosting() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [contentType, setContentType] = useState<string>("video");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);

  const { data: connectedPlatforms, isLoading: loadingPlatforms } =
    trpc.platformPosting.getConnectedPlatforms.useQuery();

  const postMutation = trpc.platformPosting.postToMultiplePlatforms.useMutation({
    onSuccess: () => {
      toast({
        title: "Posted successfully!",
        description: `Content published to ${selectedPlatforms.length} platform(s)`,
      });
      // Reset form
      setCaption("");
      setHashtags("");
      setSelectedPlatforms([]);
      setMediaFiles([]);
      setMediaUrls([]);
      utils.platformPosting.getPostHistory.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Post failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setMediaFiles(Array.from(e.target.files));
      // In production, upload to S3 and get URLs
      // For now, create placeholder URLs
      const urls = Array.from(e.target.files).map((f) => URL.createObjectURL(f));
      setMediaUrls(urls);
    }
  };

  const handlePost = () => {
    if (selectedPlatforms.length === 0) {
      toast({
        title: "No platforms selected",
        description: "Please select at least one platform",
        variant: "destructive",
      });
      return;
    }

    if (!caption.trim() && contentType === "text") {
      toast({
        title: "Caption required",
        description: "Please enter a caption for your post",
        variant: "destructive",
      });
      return;
    }

    postMutation.mutate({
      platforms: selectedPlatforms as any,
      contentType: contentType as any,
      caption,
      hashtags,
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
    });
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId) ? prev.filter((p) => p !== platformId) : [...prev, platformId]
    );
  };

  const connectedPlatformIds = connectedPlatforms?.map((p) => p.platform) || [];

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Multi-Platform Posting</h1>
        <p className="text-muted-foreground">
          Deploy your content to every platform with one click. AI-powered formatting for each platform's guidelines.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Platform Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Platforms</CardTitle>
            <CardDescription>Choose which platforms to post to</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPlatforms ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading connected platforms...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {PLATFORMS.map((platform) => {
                  const isConnected = connectedPlatformIds.includes(platform.id);
                  const isSelected = selectedPlatforms.includes(platform.id);

                  return (
                    <div
                      key={platform.id}
                      className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                        isSelected ? "border-primary bg-primary/5" : "border-border"
                      } ${!isConnected ? "opacity-50 cursor-not-allowed" : ""}`}
                      onClick={() => isConnected && togglePlatform(platform.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox checked={isSelected && isConnected} disabled={!isConnected} />
                        <div>
                          <div className="font-medium">{platform.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {isConnected ? (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="h-3 w-3" />
                                Connected
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-destructive">
                                <XCircle className="h-3 w-3" />
                                Not connected
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {connectedPlatformIds.length === 0 && !loadingPlatforms && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No platforms connected yet.</p>
                <p className="text-sm mt-2">Connect your accounts to start posting.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Type */}
        <Card>
          <CardHeader>
            <CardTitle>Content Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Caption */}
        <Card>
          <CardHeader>
            <CardTitle>Caption</CardTitle>
            <CardDescription>Write your post caption (will be auto-formatted for each platform)</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Write your caption here..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <div className="mt-2 text-sm text-muted-foreground">{caption.length} characters</div>
          </CardContent>
        </Card>

        {/* Hashtags */}
        <Card>
          <CardHeader>
            <CardTitle>Hashtags</CardTitle>
            <CardDescription>Comma-separated hashtags (auto-limited per platform)</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="#creator, #content, #viral"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Media Upload */}
        {contentType !== "text" && (
          <Card>
            <CardHeader>
              <CardTitle>Media</CardTitle>
              <CardDescription>Upload images or videos for your post</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button variant="outline" asChild>
                    <label className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Media
                      <input
                        type="file"
                        className="hidden"
                        accept={contentType === "video" ? "video/*" : "image/*"}
                        multiple={contentType === "carousel"}
                        onChange={handleFileUpload}
                      />
                    </label>
                  </Button>
                  {mediaFiles.length > 0 && (
                    <span className="text-sm text-muted-foreground">{mediaFiles.length} file(s) selected</span>
                  )}
                </div>

                {mediaFiles.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {mediaFiles.map((file, idx) => (
                      <div key={idx} className="relative rounded-lg border p-2">
                        <div className="aspect-square bg-muted rounded flex items-center justify-center">
                          {file.type.startsWith("image/") ? (
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <video src={URL.createObjectURL(file)} className="w-full h-full object-cover rounded" />
                          )}
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={() => {
                            setMediaFiles((prev) => prev.filter((_, i) => i !== idx));
                            setMediaUrls((prev) => prev.filter((_, i) => i !== idx));
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Post Button */}
        <Button
          size="lg"
          onClick={handlePost}
          disabled={postMutation.isPending || selectedPlatforms.length === 0}
          className="w-full"
        >
          {postMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Posting to {selectedPlatforms.length} platform(s)...
            </>
          ) : (
            `Post to ${selectedPlatforms.length} Platform(s)`
          )}
        </Button>
      </div>
    </div>
  );
}
