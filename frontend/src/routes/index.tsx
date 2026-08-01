import { component$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import {
  WandIcon,
  MessageSquareIcon,
  BookOpenIcon,
  DatabaseIcon,
  LineChartIcon,
  ShieldIcon,
  ZapIcon,
  ArrowRightIcon,
  StarIcon,
  CheckCircle2Icon,
  GraduationCapIcon,
  UsersIcon,
} from "lucide-qwik";
import { Button } from "~/components/atoms/Button";

export default component$(() => {
  const features = [
    {
      icon: MessageSquareIcon,
      title: "AI Chat Support",
      description: "Get instant answers to your academic questions with our intelligent AI assistant. Available 24/7 to help with homework, exam prep, and more.",
      color: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
    },
    {
      icon: DatabaseIcon,
      title: "Knowledge Base",
      description: "Access a curated library of learning materials. Upload textbooks and notes — the AI references your curriculum when generating answers.",
      color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    },
    {
      icon: BookOpenIcon,
      title: "Homework Help",
      description: "Upload assignments and receive step-by-step explanations across all subjects and difficulty levels, tailored to your coursework.",
      color: "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400",
    },
    {
      icon: LineChartIcon,
      title: "Progress Tracking",
      description: "Monitor your academic progress with detailed analytics. See which subjects you're mastering and where you need more practice.",
      color: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400",
    },
    {
      icon: ShieldIcon,
      title: "Secure & Private",
      description: "Your data is encrypted and protected. We maintain the highest standards of security and privacy for all student information.",
      color: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
    },
    {
      icon: ZapIcon,
      title: "Fast & Reliable",
      description: "Get responses in milliseconds with our optimized infrastructure. Available whenever you need it, wherever you study.",
      color: "bg-yellow-50 text-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-400",
    },
  ];

  const stats = [
    { value: "10K+", label: "Active Students", icon: UsersIcon },
    { value: "50K+", label: "Questions Answered", icon: MessageSquareIcon },
    { value: "5K+", label: "Curriculum Docs", icon: DatabaseIcon },
    { value: "99.9%", label: "API Uptime", icon: ZapIcon },
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Computer Science Student",
      content: "Azubi Success has completely transformed how I study. The AI explanations are clear and it's like having a tutor available 24/7.",
      rating: 5,
    },
    {
      name: "Michael Chen",
      role: "Mathematics Major",
      content: "The step-by-step problem solving help is incredible. I've improved my grades significantly since using this platform.",
      rating: 5,
    },
    {
      name: "Emily Rodriguez",
      role: "Science Student",
      content: "I love how it adapts to my learning style. The personalized recommendations have made studying so much more efficient.",
      rating: 5,
    },
  ];

  return (
    <div class="pt-16">
      <section class="relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-primary-950/20 dark:via-surface dark:to-blue-950/20" />
        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div class="text-center max-w-3xl mx-auto">
            <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 text-sm font-medium mb-8 border border-primary-200 dark:border-primary-800">
              <WandIcon class="h-4 w-4" />
              Azubi Success Student Support
            </div>
            <h1 class="text-4xl md:text-6xl font-bold text-text-primary leading-tight mb-6">
              Your AI-Powered
              <span class="text-primary-600 block">Study Companion</span>
            </h1>
            <p class="text-lg md:text-xl text-text-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
              Get instant help with homework, exam preparation, and academic questions.
              Our intelligent AI assistant is available 24/7 to support your learning journey.
            </p>
            <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/register">
                <Button variant="primary" size="lg">
                  Get Started Free
                  <ArrowRightIcon class="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="secondary" size="lg">
                  Sign In
                </Button>
              </Link>
            </div>
            <div class="flex items-center justify-center gap-8 mt-10 text-sm text-text-muted">
              <div class="flex items-center gap-2">
                <CheckCircle2Icon class="h-4 w-4 text-green-500" />
                No credit card
              </div>
              <div class="flex items-center gap-2">
                <CheckCircle2Icon class="h-4 w-4 text-green-500" />
                Free forever
              </div>
              <div class="flex items-center gap-2">
                <CheckCircle2Icon class="h-4 w-4 text-green-500" />
                Cancel anytime
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" class="py-20 md:py-28">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h2 class="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Everything You Need to Succeed
            </h2>
            <p class="text-lg text-text-secondary max-w-2xl mx-auto">
              Comprehensive AI-powered tools from Azubi Success designed to support every aspect of your academic journey.
            </p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                class="rounded-2xl border border-border bg-surface p-6 hover:shadow-lg hover:shadow-border/50 transition-all duration-300 hover:-translate-y-1"
              >
                <div class={[`rounded-xl p-3 w-fit mb-4`, feature.color].join(" ")}>
                  <feature.icon class="h-6 w-6" />
                </div>
                <h3 class="text-lg font-semibold text-text-primary mb-2">{feature.title}</h3>
                <p class="text-sm text-text-secondary leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section class="py-20 bg-surface-secondary">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} class="text-center">
                <div class="inline-flex items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-950/40 p-3 mb-3">
                  <stat.icon class="h-6 w-6 text-primary-600" />
                </div>
                <div class="text-3xl md:text-4xl font-bold text-text-primary mb-1">{stat.value}</div>
                <div class="text-sm text-text-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" class="py-20 md:py-28">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h2 class="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Loved by Students Everywhere
            </h2>
            <p class="text-lg text-text-secondary max-w-2xl mx-auto">
              See what students are saying about their experience with Azubi Success.
            </p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.name}
                class="rounded-2xl border border-border bg-surface p-6"
              >
                <div class="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <StarIcon key={i} class="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p class="text-sm text-text-secondary mb-4 leading-relaxed">
                  "{testimonial.content}"
                </p>
                <div class="flex items-center gap-3">
                  <div class="rounded-full bg-primary-100 dark:bg-primary-900 p-2">
                    <GraduationCapIcon class="h-4 w-4 text-primary-600" />
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-text-primary">{testimonial.name}</p>
                    <p class="text-xs text-text-muted">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section class="py-20 md:py-28 bg-gradient-to-br from-primary-600 to-primary-800">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Learning?
          </h2>
          <p class="text-lg text-primary-100 mb-10 max-w-2xl mx-auto">
            Join students using Azubi Success to achieve their academic goals with AI-powered support.
            Start your journey today at portal.azubisuccess.space.
          </p>
          <Link href="/auth/register">
            <Button
              variant="secondary"
              size="lg"
              class="!bg-white !text-primary-700 hover:!bg-primary-50 !border-transparent"
            >
              Get Started Free
              <ArrowRightIcon class="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
});
