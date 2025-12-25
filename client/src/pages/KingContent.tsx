import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, FileText, Image, Music } from "lucide-react";

export default function KingContent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Content Management</h1>
          <p className="text-gray-400">Moderate and manage all platform content</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-slate-800/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Video className="h-5 w-5 text-purple-400" />
                Videos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">0</div>
              <p className="text-sm text-gray-400 mt-1">Total videos</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Image className="h-5 w-5 text-blue-400" />
                Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">0</div>
              <p className="text-sm text-gray-400 mt-1">Total images</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Music className="h-5 w-5 text-pink-400" />
                Audio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">0</div>
              <p className="text-sm text-gray-400 mt-1">Total audio files</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-400" />
                Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">0</div>
              <p className="text-sm text-gray-400 mt-1">Total posts</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-800/50 border-white/10 mt-8">
          <CardHeader>
            <CardTitle className="text-white">Recent Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-gray-400">
              No content to moderate yet
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
