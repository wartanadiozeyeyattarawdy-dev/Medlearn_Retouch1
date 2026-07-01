import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============================================================
// SERVICES ÉTUDIANTS
// ============================================================

export const listStudentServices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data } = await supabase
      .from("student_services")
      .select(`
        *,
        profiles:user_id (full_name, avatar_emoji, is_verified),
        modules:module_id (name, emoji)
      `)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    return data ?? [];
  });

export const getStudentService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: service } = await supabase
      .from("student_services")
      .select(`
        *,
        profiles:user_id (full_name, avatar_emoji, is_verified, bio, specialization),
        modules:module_id (name, emoji)
      `)
      .eq("id", data.id)
      .single();

    return service;
  });

export const createStudentService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      title: z.string().min(3).max(200),
      description: z.string().max(5000).optional(),
      type: z.enum(["summary", "tutoring", "notes", "flashcards"]),
      moduleId: z.string().uuid().nullable().optional(),
      price: z.number().min(0).default(0),
      isFree: z.boolean().default(true),
      tags: z.array(z.string()).max(10).default([]),
    }).parse(i)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: service, error } = await supabase
      .from("student_services")
      .insert({
        user_id: userId,
        title: data.title,
        description: data.description,
        type: data.type,
        module_id: data.moduleId,
        price: data.price,
        is_free: data.isFree,
        tags: data.tags,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return service;
  });

export const adminApproveService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["approved", "rejected"]),
      adminNote: z.string().optional(),
    }).parse(i)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Vérifier admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (!(roles ?? []).some((r) => r.role === "admin")) throw new Error("Admin requis");

    const { error } = await supabase
      .from("student_services")
      .update({
        status: data.status === "approved" ? "published" : "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// COURS PROFESSEURS
// ============================================================

export const listProfessorCourses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data } = await supabase
      .from("professor_courses")
      .select(`
        *,
        profiles:user_id (full_name, avatar_emoji, is_verified, specialization),
        modules:module_id (name, emoji)
      `)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    return data ?? [];
  });

export const getProfessorCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: course } = await supabase
      .from("professor_courses")
      .select(`
        *,
        profiles:user_id (full_name, avatar_emoji, is_verified, bio, specialization, institution),
        modules:module_id (name, emoji)
      `)
      .eq("id", data.id)
      .single();

    return course;
  });

export const createProfessorCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      title: z.string().min(3).max(200),
      description: z.string().max(5000).optional(),
      category: z.string().optional(),
      level: z.enum(["beginner", "intermediate", "advanced", "all"]).default("all"),
      price: z.number().min(0).default(0),
      isFree: z.boolean().default(true),
      moduleId: z.string().uuid().nullable().optional(),
      tags: z.array(z.string()).max(10).default([]),
      videoUrl: z.string().url().optional(),
      thumbnailUrl: z.string().url().optional(),
    }).parse(i)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Vérifier que l'utilisateur est professeur ou admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const isProfessor = (roles ?? []).some((r) => r.role === "admin" || r.role === "professor");
    if (!isProfessor) throw new Error("Seuls les professeurs peuvent créer des cours");

    const { data: course, error } = await supabase
      .from("professor_courses")
      .insert({
        user_id: userId,
        title: data.title,
        description: data.description,
        category: data.category,
        level: data.level,
        price: data.price,
        is_free: data.isFree,
        module_id: data.moduleId,
        tags: data.tags,
        video_url: data.videoUrl,
        thumbnail_url: data.thumbnailUrl,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return course;
  });

// ============================================================
// EXAMENS BLANCS
// ============================================================

export const listMockExams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data } = await supabase
      .from("mock_exams")
      .select(`
        *,
        profiles:user_id (full_name, avatar_emoji, is_verified),
        modules:module_id (name, emoji)
      `)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    return data ?? [];
  });

export const getMockExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: exam } = await supabase
      .from("mock_exams")
      .select(`
        *,
        profiles:user_id (full_name, avatar_emoji, is_verified, bio, institution),
        modules:module_id (name, emoji),
        mock_exam_questions (
          id,
          ord,
          points,
          questions:question_id (*)
        )
      `)
      .eq("id", data.id)
      .single();

    return exam;
  });

export const createMockExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      title: z.string().min(3).max(200),
      description: z.string().max(5000).optional(),
      moduleId: z.string().uuid().nullable().optional(),
      durationMinutes: z.number().min(5).max(180).default(60),
      totalQuestions: z.number().min(1).max(100).default(10),
      passingScore: z.number().min(0).max(100).default(60),
      isFree: z.boolean().default(true),
      price: z.number().min(0).default(0),
      startDate: z.string().datetime().nullable().optional(),
      endDate: z.string().datetime().nullable().optional(),
      questions: z.array(z.string().uuid()).min(1).max(100),
    }).parse(i)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Vérifier que l'utilisateur est professeur ou admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const isProfessor = (roles ?? []).some((r) => r.role === "admin" || r.role === "professor");
    if (!isProfessor) throw new Error("Seuls les professeurs peuvent créer des examens");

    // Créer l'examen
    const { data: exam, error } = await supabase
      .from("mock_exams")
      .insert({
        user_id: userId,
        title: data.title,
        description: data.description,
        module_id: data.moduleId,
        duration_minutes: data.durationMinutes,
        total_questions: data.totalQuestions,
        passing_score: data.passingScore,
        is_free: data.isFree,
        price: data.price,
        start_date: data.startDate,
        end_date: data.endDate,
        status: "draft",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Ajouter les questions
    const questions = data.questions.map((q, index) => ({
      exam_id: exam.id,
      question_id: q,
      ord: index,
    }));

    const { error: qError } = await supabase
      .from("mock_exam_questions")
      .insert(questions);

    if (qError) throw new Error(qError.message);

    return exam;
  });

export const startMockExamAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ examId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Vérifier si l'utilisateur a déjà une tentative en cours
    const { data: existing } = await supabase
      .from("mock_exam_attempts")
      .select("id")
      .eq("exam_id", data.examId)
      .eq("user_id", userId)
      .eq("status", "in_progress")
      .maybeSingle();

    if (existing) {
      return { attemptId: existing.id, isNew: false };
    }

    // Créer une nouvelle tentative
    const { data: attempt, error } = await supabase
      .from("mock_exam_attempts")
      .insert({
        exam_id: data.examId,
        user_id: userId,
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { attemptId: attempt.id, isNew: true };
  });

export const submitMockExamAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      attemptId: z.string().uuid(),
      answers: z.record(z.string(), z.string()),
      timeSpent: z.number().min(0),
    }).parse(i)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Récupérer la tentative
    const { data: attempt } = await supabase
      .from("mock_exam_attempts")
      .select("exam_id, mock_exams(passing_score)")
      .eq("id", data.attemptId)
      .eq("user_id", userId)
      .single();

    if (!attempt) throw new Error("Tentative introuvable");

    // Récupérer les questions pour calculer le score
    const { data: questions } = await supabase
      .from("mock_exam_questions")
      .select("question_id, points, questions(choices(is_correct))")
      .eq("exam_id", attempt.exam_id);

    let correctAnswers = 0;
    let totalPoints = 0;

    for (const q of questions ?? []) {
      const answer = data.answers[q.question_id];
      const choices = (q.questions as any)?.choices || [];
      const correctChoice = choices.find((c: any) => c.is_correct);
      
      if (correctChoice && answer === correctChoice.id) {
        correctAnswers++;
        totalPoints += q.points || 1;
      }
    }

    const totalQuestions = questions?.length || 0;
    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const passed = score >= (attempt.mock_exams?.passing_score || 60);

    // Mettre à jour la tentative
    const { error } = await supabase
      .from("mock_exam_attempts")
      .update({
        score,
        correct_answers: correctAnswers,
        total_questions: totalQuestions,
        time_spent: data.timeSpent,
        answers: data.answers,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", data.attemptId);

    if (error) throw new Error(error.message);

    // Mettre à jour les statistiques de l'examen
    await supabase
      .from("mock_exams")
      .update({
        attempts_count: supabase.rpc("increment", { col: "attempts_count" }),
        average_score: supabase.rpc("avg", { col: "average_score", value: score }),
      })
      .eq("id", attempt.exam_id);

    return { score, correctAnswers, totalQuestions, passed };
  });

// ============================================================
// SUIVI (FOLLOW)
// ============================================================

export const toggleFollow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ targetUserId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.targetUserId === userId) {
      throw new Error("Vous ne pouvez pas vous suivre vous-même");
    }

    // Vérifier si déjà suivi
    const { data: existing } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", userId)
      .eq("following_id", data.targetUserId)
      .maybeSingle();

    if (existing) {
      // Désuivre
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("id", existing.id);
      
      if (error) throw new Error(error.message);
      return { following: false };
    } else {
      // Suivre
      const { error } = await supabase
        .from("follows")
        .insert({
          follower_id: userId,
          following_id: data.targetUserId,
        });
      
      if (error) throw new Error(error.message);
      return { following: true };
    }
  });

export const getFollowStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ targetUserId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", userId)
      .eq("following_id", data.targetUserId)
      .maybeSingle();

    return { following: !!existing };
  });

export const getFollowers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: followers } = await supabase
      .from("follows")
      .select(`
        follower_id,
        profiles:follower_id (full_name, avatar_emoji, is_verified)
      `)
      .eq("following_id", data.userId);

    return followers ?? [];
  });

export const getFollowing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: following } = await supabase
      .from("follows")
      .select(`
        following_id,
        profiles:following_id (full_name, avatar_emoji, is_verified)
      `)
      .eq("follower_id", data.userId);

    return following ?? [];
  });