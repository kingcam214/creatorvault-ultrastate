import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function University() {
  const { data: courses, isLoading } = trpc.university.getCourses.useQuery();

  if (isLoading) {
    return <div className="container py-8">Loading courses...</div>;
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">CreatorVault University</h1>
        <p className="text-muted-foreground">
          Master creator skills with courses from industry experts
        </p>
      </div>

      {courses && courses.length === 0 ? (
        <Card className="p-12 text-center">
          <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
          <p className="text-muted-foreground mb-4">
            Check back soon for new courses
          </p>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses?.map((course: any) => (
            <Card key={course.courseId} className="p-6">
              <h3 className="text-xl font-semibold mb-2">{course.title}</h3>
              <p className="text-muted-foreground mb-4">{course.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {course.free ? "Free" : `$${course.price} ${course.currency}`}
                </span>
                <Button asChild>
                  <Link href={`/course/${course.courseId}`}>Enroll</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
