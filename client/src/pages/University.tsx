import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BookOpen, GraduationCap, Search, Plus, DollarSign, Users, Award, Clock, Play, CheckCircle2 } from "lucide-react";

export default function University() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);

  // Queries
  const { data: courses = [], refetch: refetchCourses } = trpc.university.getCourses.useQuery();
  
  // Mutations
  const createCourseMutation = trpc.university.createCourse.useMutation({
    onSuccess: () => {
      toast.success("Course created successfully!");
      setCreateDialogOpen(false);
      refetchCourses();
    },
    onError: (error) => {
      toast.error(`Failed to create course: ${error.message}`);
    },
  });

  const enrollMutation = trpc.university.enroll.useMutation({
    onSuccess: () => {
      toast.success("Enrolled successfully!");
      setEnrollDialogOpen(false);
      refetchCourses();
    },
    onError: (error) => {
      toast.error(`Failed to enroll: ${error.message}`);
    },
  });

  // Form state
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    price: 0,
    isFree: true,
    currency: "USD" as "USD" | "DOP" | "HTG",
  });

  const handleCreateCourse = () => {
    if (!courseForm.title.trim()) {
      toast.error("Course title is required");
      return;
    }

    createCourseMutation.mutate(courseForm);
  };

  const handleEnroll = (courseId: string) => {
    enrollMutation.mutate({ courseId });
  };

  const categories = [
    { value: "all", label: "All Courses" },
    { value: "adult-monetization", label: "Adult Monetization" },
    { value: "content-creation", label: "Content Creation" },
    { value: "dominican-culture", label: "Dominican Culture" },
    { value: "business", label: "Business" },
    { value: "marketing", label: "Marketing" },
    { value: "psychology", label: "Psychology" },
    { value: "technical", label: "Technical" },
  ];

  const filteredCourses = courses.filter((course: any) => {
    const matchesSearch = course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || course.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const isCreator = user?.role === "creator" || user?.role === "influencer" || user?.role === "celebrity" || user?.role === "admin" || user?.role === "king";

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 via-black to-black">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20" />
        <div className="container relative py-16">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="h-12 w-12 text-purple-400" />
              <h1 className="text-5xl font-bold text-white">CreatorVault University</h1>
            </div>
            <p className="text-xl text-gray-300 mb-8">
              Master the skills that turn creators into entrepreneurs. Learn from the best, earn while you learn, and build your empire.
            </p>
            <div className="flex gap-4">
              {isCreator && (
                <Button
                  size="lg"
                  onClick={() => setCreateDialogOpen(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Create Course
                </Button>
              )}
              <Button size="lg" variant="outline" className="border-purple-500 text-purple-400 hover:bg-purple-950">
                <BookOpen className="mr-2 h-5 w-5" />
                Browse Catalog
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-purple-900/50 to-black border-purple-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Total Courses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{courses.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-pink-900/50 to-black border-pink-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Free Courses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {courses.filter((c: any) => c.isFree).length}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-900/50 to-black border-blue-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{categories.length - 1}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-900/50 to-black border-green-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Certificates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">Available</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="container py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-black/50 border-purple-500/30 text-white"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-[200px] bg-black/50 border-purple-500/30 text-white">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Course Grid */}
        {filteredCourses.length === 0 ? (
          <Card className="bg-black/50 border-purple-500/30">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BookOpen className="h-16 w-16 text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No courses found</h3>
              <p className="text-gray-400 text-center max-w-md mb-6">
                {isCreator
                  ? "Be the first to create a course and share your knowledge with the CreatorVault community."
                  : "Check back soon for new courses from top creators."}
              </p>
              {isCreator && (
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Course
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course: any) => (
              <Card
                key={course.id}
                className="bg-gradient-to-br from-purple-900/30 to-black border-purple-500/30 hover:border-purple-500/60 transition-all cursor-pointer group"
                onClick={() => {
                  setSelectedCourse(course);
                  setEnrollDialogOpen(true);
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge
                      variant={course.isFree ? "secondary" : "default"}
                      className={course.isFree ? "bg-green-600" : "bg-purple-600"}
                    >
                      {course.isFree ? "Free" : `$${(course.priceAmount / 100).toFixed(2)}`}
                    </Badge>
                    <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                      {course.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-white group-hover:text-purple-400 transition-colors">
                    {course.title}
                  </CardTitle>
                  <CardDescription className="text-gray-400 line-clamp-2">
                    {course.description || "No description available"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>Self-paced</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>0 enrolled</span>
                    </div>
                  </div>
                  <Button
                    className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCourse(course);
                      setEnrollDialogOpen(true);
                    }}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Enroll Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Course Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-gradient-to-br from-purple-950 to-black border-purple-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl">Create New Course</DialogTitle>
            <DialogDescription className="text-gray-400">
              Share your knowledge and earn from your expertise
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Course Title</Label>
              <Input
                id="title"
                placeholder="e.g., Mastering Adult Content Monetization"
                value={courseForm.title}
                onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                className="bg-black/50 border-purple-500/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What will students learn?"
                value={courseForm.description}
                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                className="bg-black/50 border-purple-500/30 min-h-[100px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="0.00"
                  value={courseForm.price}
                  onChange={(e) => setCourseForm({ ...courseForm, price: parseFloat(e.target.value) || 0 })}
                  disabled={courseForm.isFree}
                  className="bg-black/50 border-purple-500/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={courseForm.currency}
                  onValueChange={(value: "USD" | "DOP" | "HTG") =>
                    setCourseForm({ ...courseForm, currency: value })
                  }
                  disabled={courseForm.isFree}
                >
                  <SelectTrigger className="bg-black/50 border-purple-500/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="DOP">DOP</SelectItem>
                    <SelectItem value="HTG">HTG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isFree"
                checked={courseForm.isFree}
                onChange={(e) => setCourseForm({ ...courseForm, isFree: e.target.checked, price: 0 })}
                className="rounded border-purple-500/30"
              />
              <Label htmlFor="isFree" className="cursor-pointer">
                Make this course free
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="border-purple-500/30">
              Cancel
            </Button>
            <Button
              onClick={handleCreateCourse}
              disabled={createCourseMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
            >
              {createCourseMutation.isPending ? "Creating..." : "Create Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enroll Dialog */}
      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent className="bg-gradient-to-br from-purple-950 to-black border-purple-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedCourse?.title}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedCourse?.description || "No description available"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Price:</span>
              <span className="text-2xl font-bold text-white">
                {selectedCourse?.isFree ? (
                  <Badge className="bg-green-600">Free</Badge>
                ) : (
                  `$${((selectedCourse?.priceAmount || 0) / 100).toFixed(2)}`
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Status:</span>
              <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                {selectedCourse?.status}
              </Badge>
            </div>
            {!selectedCourse?.isFree && (
              <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                <p className="text-sm text-yellow-400">
                  💳 Paid courses require payment before enrollment. You'll be redirected to complete payment.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollDialogOpen(false)} className="border-purple-500/30">
              Cancel
            </Button>
            <Button
              onClick={() => handleEnroll(selectedCourse?.id)}
              disabled={enrollMutation.isPending || !selectedCourse?.isFree}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
            >
              {enrollMutation.isPending ? "Enrolling..." : selectedCourse?.isFree ? "Enroll Free" : "Pay & Enroll"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
