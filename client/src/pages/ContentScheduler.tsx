import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar as CalendarIcon, Clock, Sparkles, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const PLATFORMS = [
  { id: "tiktok", name: "TikTok" },
  { id: "instagram", name: "Instagram" },
  { id: "youtube", name: "YouTube" },
  { id: "twitter", name: "Twitter/X" },
  { id: "facebook", name: "Facebook" },
] as const;

const CONTENT_TYPES = [
  { value: "text", label: "Text Post" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "reel", label: "Reel/Short" },
] as const;

export function ContentScheduler() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [contentType, setContentType] = useState<string>("video");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState("15:00");

  const { data: scheduledPosts, isLoading: loadingScheduled } =
    trpc.scheduler.getScheduledPosts.useQuery({ status: "scheduled" });

  const { data: optimalTimes } = trpc.scheduler.getOptimalPostingTimes.useQuery(
    { platform: selectedPlatforms[0] as any },
    { enabled: selectedPlatforms.length > 0 }
  );

  const scheduleMutation = trpc.scheduler.schedulePost.useMutation({
    onSuccess: () => {
      toast({
        title: "Post scheduled!",
        description: "Your content has been scheduled for publishing",
      });
      setCaption("");
      setHashtags("");
      setSelectedPlatforms([]);
      utils.scheduler.getScheduledPosts.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Schedule failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelMutation = trpc.scheduler.cancelScheduledPost.useMutation({
    onSuccess: () => {
      toast({ title: "Post cancelled" });
      utils.scheduler.getScheduledPosts.invalidate();
    },
  });

  const handleSchedule = () => {
    if (!selectedDate) {
      toast({
        title: "Date required",
        description: "Please select a date",
        variant: "destructive",
      });
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast({
        title: "No platforms selected",
        variant: "destructive",
      });
      return;
    }

    const [hours, minutes] = selectedTime.split(":").map(Number);
    const scheduledFor = new Date(selectedDate);
    scheduledFor.setHours(hours, minutes, 0, 0);

    scheduleMutation.mutate({
      caption,
      hashtags,
      contentType: contentType as any,
      platforms: selectedPlatforms as any,
      scheduledFor,
    });
  };

  const useOptimalTime = () => {
    if (optimalTimes && optimalTimes.length > 0) {
      const optimal = optimalTimes[0];
      const nextDate = new Date();
      
      // Find next occurrence of optimal day/hour
      const currentDay = nextDate.getDay();
      let daysUntil = optimal.dayOfWeek - currentDay;
      if (daysUntil < 0) daysUntil += 7;
      
      nextDate.setDate(nextDate.getDate() + daysUntil);
      nextDate.setHours(optimal.hour, 0, 0, 0);
      
      setSelectedDate(nextDate);
      setSelectedTime(`${optimal.hour.toString().padStart(2, "0")}:00`);
      
      toast({
        title: "Optimal time selected",
        description: `Scheduled for ${format(nextDate, "PPP 'at' p")}`,
      });
    }
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId) ? prev.filter((p) => p !== platformId) : [...prev, platformId]
    );
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Content Scheduler</h1>
        <p className="text-muted-foreground">
          Schedule posts for optimal engagement times. AI-powered recommendations for each platform.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column: Schedule Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>New Scheduled Post</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Platforms */}
              <div>
                <label className="text-sm font-medium mb-2 block">Platforms</label>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMS.map((platform) => (
                    <div
                      key={platform.id}
                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${
                        selectedPlatforms.includes(platform.id) ? "border-primary bg-primary/5" : "border-border"
                      }`}
                      onClick={() => togglePlatform(platform.id)}
                    >
                      <Checkbox checked={selectedPlatforms.includes(platform.id)} />
                      <span className="text-sm">{platform.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Content Type */}
              <div>
                <label className="text-sm font-medium mb-2 block">Content Type</label>
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
              </div>

              {/* Caption */}
              <div>
                <label className="text-sm font-medium mb-2 block">Caption</label>
                <Textarea
                  placeholder="Write your caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Hashtags */}
              <div>
                <label className="text-sm font-medium mb-2 block">Hashtags</label>
                <Input
                  placeholder="#creator, #content"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Date</label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    className="rounded-md border"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Time</label>
                  <Input type="time" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} />
                  
                  {optimalTimes && optimalTimes.length > 0 && (
                    <Button variant="outline" size="sm" onClick={useOptimalTime} className="mt-2 w-full">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Use Optimal Time
                    </Button>
                  )}
                </div>
              </div>

              <Button
                onClick={handleSchedule}
                disabled={scheduleMutation.isPending}
                className="w-full"
                size="lg"
              >
                {scheduleMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Schedule Post
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Optimal Times */}
          {optimalTimes && optimalTimes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  Optimal Posting Times
                </CardTitle>
                <CardDescription>Best times for {selectedPlatforms[0]?.toUpperCase()}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {optimalTimes.slice(0, 3).map((time, idx) => {
                    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                    return (
                      <div key={idx} className="flex items-center justify-between p-2 rounded border">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {days[time.dayOfWeek]} at {time.hour}:00
                          </span>
                        </div>
                        <Badge variant="secondary">{time.avgEngagementRate.toFixed(1)}% engagement</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Scheduled Posts */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Posts</CardTitle>
              <CardDescription>Upcoming scheduled content</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingScheduled ? (
                <div className="flex items-center gap-2 py-8 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : scheduledPosts && scheduledPosts.length > 0 ? (
                <div className="space-y-4">
                  {scheduledPosts.map((post) => (
                    <div key={post.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium line-clamp-2">{post.caption}</p>
                          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <CalendarIcon className="h-3 w-3" />
                            {format(new Date(post.scheduledFor), "PPP 'at' p")}
                          </div>
                          <div className="flex gap-1 mt-2">
                            {post.platforms.map((platform) => (
                              <Badge key={platform} variant="secondary" className="text-xs">
                                {platform}
                              </Badge>
                            ))}
                          </div>
                          {post.isOptimalTime && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Optimal time
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => cancelMutation.mutate({ scheduleId: post.id })}
                          disabled={cancelMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No scheduled posts yet</p>
                  <p className="text-sm mt-2">Schedule your first post to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
