import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Sparkles, Clock, CheckCircle } from "lucide-react";

export default function KingVideoLab() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Video Lab</h1>
          <p className="text-gray-400">AI video generation and management</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-slate-800/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-400" />
                Generating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">0</div>
              <p className="text-sm text-gray-400 mt-1">In progress</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-400" />
                Queued
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">0</div>
              <p className="text-sm text-gray-400 mt-1">Waiting</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">0</div>
              <p className="text-sm text-gray-400 mt-1">Ready</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Video className="h-5 w-5 text-purple-400" />
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">0</div>
              <p className="text-sm text-gray-400 mt-1">All videos</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-800/50 border-white/10 mt-8">
          <CardHeader>
            <CardTitle className="text-white">Recent Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-gray-400">
              No video generation jobs yet
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
