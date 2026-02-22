from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from .models import Profile, Lesson, UserLessonProgress
from .serializers import ProfileSerializer, LessonSerializer, UserLessonProgressSerializer, UserSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        # Manual creation to handle password hashing and profile creation
        username = request.data.get('username')
        password = request.data.get('password')
        first_name = request.data.get('first_name', '')
        email = request.data.get('email', '')

        if not username or not password:
            return Response({'error': 'Username and password required'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'User already exists'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, password=password, email=email, first_name=first_name)
        
        # Create user profile
        Profile.objects.create(user=user)
        
        # Generate token
        token, created = Token.objects.get_or_create(user=user)

        return Response({
            'token': token.key,
            'user_id': user.pk,
            'email': user.email,
            'username': user.username
        }, status=status.HTTP_201_CREATED)

class CustomAuthToken(ObtainAuthToken):
    """
    Custom Login API that returns Token + User ID + Email
    """
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        
        # Ensure profile exists (backward compatibility)
        Profile.objects.get_or_create(user=user)

        return Response({
            'token': token.key,
            'user_id': user.pk,
            'email': user.email,
            'username': user.username
        })

class DashboardViewSet(viewsets.ViewSet):
    """
    API Bundle for the Dashboard
    """
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        user = request.user
        profile, _ = Profile.objects.get_or_create(user=user)
        
        # Total lessons for user's level
        total_level_lessons = Lesson.objects.filter(level=profile.level).count()
        
        # Lessons completed by user in this level
        completed_ids = UserLessonProgress.objects.filter(
            user=user, completed=True
        ).values_list('lesson_id', flat=True)
        
        completed_level_count = Lesson.objects.filter(
            level=profile.level, id__in=completed_ids
        ).count()
        
        # Calculate Percentage
        percent = 0
        if total_level_lessons > 0:
            percent = int((completed_level_count / total_level_lessons) * 100)
            
        # Missing to next level
        missing_count = max(0, total_level_lessons - completed_level_count)
        
        # Recommended lessons: Current level, not completed, ordered by 'order'
        recommended_lessons = Lesson.objects.filter(
            level=profile.level
        ).exclude(id__in=completed_ids).order_by('order')[:3]
        
        # If all current level lessons completed, maybe show next level? 
        # For now, just show current level or empty
        
        profile_data = ProfileSerializer(profile).data
        lessons_data = LessonSerializer(recommended_lessons, many=True).data

        return Response({
            'profile': profile_data,
            'stats': {
                'completed_lessons': len(completed_ids),
                'level_progress': percent,
                'lessons_missing': missing_count,
                'streak': profile.streak_days,
                'total_hours': profile.total_time_hours
            },
            'recommended_lessons': lessons_data
        })

from .models import Profile, Topic, Lesson, UserLessonProgress
from .serializers import ProfileSerializer, TopicSerializer, LessonSerializer, UserLessonProgressSerializer, UserSerializer

class TopicViewSet(viewsets.ModelViewSet):
    queryset = Topic.objects.all().order_by('order')
    serializer_class = TopicSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_level = self.request.user.profile.level
        return Topic.objects.filter(level=user_level).order_by('order')

class LessonViewSet(viewsets.ModelViewSet):
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer
    permission_classes = [permissions.IsAuthenticated]

class UserProgressViewSet(viewsets.ModelViewSet):
    serializer_class = UserLessonProgressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserLessonProgress.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        # Use update_or_create logic instead of simple create to avoid duplicates
        user = request.user
        lesson_id = request.data.get('lesson') or request.data.get('lesson_id')
        
        if not lesson_id:
            return Response({"error": "Lesson ID required"}, status=status.HTTP_400_BAD_REQUEST)

        progress, created = UserLessonProgress.objects.update_or_create(
            user=user,
            lesson_id=lesson_id,
            defaults={
                'completed': request.data.get('completed', True),
                'score': request.data.get('score', 0)
            }
        )
        
        serializer = self.get_serializer(progress)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

import google.generativeai as genai
from django.conf import settings

class WritingEvaluationViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request):
        text = request.data.get('text')
        prompt_context = request.data.get('prompt', 'General practice')
        submission_type = request.data.get('submission_type', 'writing')

        if not text:
            return Response({'error': 'No text provided'}, status=status.HTTP_400_BAD_REQUEST)

        api_key = getattr(settings, 'GEMINI_API_KEY', None)
        if not api_key:
             return Response({'feedback': "AI feedback unavailable (API Key missing). Great job!", 'score': 10}, status=status.HTTP_200_OK)

        try:
            genai.configure(api_key=api_key)
            
            if submission_type == 'speaking':
                evaluation_prompt = f"""
                Act as a C1 Advanced (CAE) or IELTS examiner. Evaluate the following TRANSCRIPT of a student's spoken response. The task was: "{prompt_context}".
                
                Student Transcript:
                "{text}"
                
                Note: Since this is a voice transcription, ignore lack of perfect punctuation. Focus on naturalness, vocabulary, and structure.
                
                PROVIDE ALL FEEDBACK IN ENGLISH. Structure your response as follows:
                
                **Naturalness & Fluency**
                Comment on whether the response sounds natural and fluid. Suggest linkers or idioms to sound more native.
                
                **Vocabulary & Expressions**
                Suggest 2-3 idioms or phrasal verbs that would have raised the level of the response.
                
                **Grammar Correction**
                Correct any obvious grammatical errors.
                
                **Pronunciation Note**
                (Remind the student to practice intonation, even though you cannot hear the audio).
                
                At the very end, on a separate line: "FINAL_SCORE: X" (1-10, based on completeness and linguistic level).
                """
            elif submission_type == 'vocabulary':
                evaluation_prompt = f"""
                Act as an English Vocabulary Tutor. Define the following words and provide examples:
                Words: "{text}"
                
                Return specific JSON format ONLY (no markdown, no extra text). The output must be a valid JSON Array of objects, where each object has:
                - "word": The word from the list.
                - "definition": A clear, simple English definition (B2 level).
                - "example": An example sentence using the word in a natural context.
                
                Example format:
                [
                    {{"word": "example", "definition": "pattern to follow", "example": "This is a good example."}}
                ]
                """
            elif submission_type == 'vocab_quiz':
                evaluation_prompt = f"""
                Act as an English Quiz Generator. Create a multiple-choice vocabulary quiz based on these words: "{text}".
                
                Generate 3 questions.
                Return specific JSON format ONLY (no markdown). The output must be a valid JSON Array of objects with:
                - "question": The question text (e.g. "What is the definition of X?" or fill-in-the-blank).
                - "options": An array of 4 distinct string options.
                - "correct_answer": The exact string of the correct option.
                
                Example format:
                [
                    {{"question": "What means X?", "options": ["A", "B", "C", "D"], "correct_answer": "A"}}
                ]
                """
            else:
                # Default WRITING prompt
                evaluation_prompt = f"""
                Actúa como un profesor de inglés nativo experto en preparación para exámenes Cambridge (nivel B2 o C1). Tu objetivo es corregir y dar retroalimentación sobre los textos que el usuario escriba, basado en la tarea: "{prompt_context}".

                Texto del usuario:
                "{text}"

                Por cada entrada del usuario, debes estructurar tu respuesta de la siguiente manera:

                **Corrected Version**
                Presenta el texto corregido con un lenguaje natural y fluido.

                **Grammar & Vocabulary**
                Explica de forma breve los errores cometidos (tiempos verbales, preposiciones, etc.) y sugiere 3 palabras o expresiones de nivel avanzado (C1/C2) para reemplazar palabras comunes.

                **Tone & Style**
                Evalúa si el tono es adecuado (formal/informal) y cómo mejorar la cohesión.

                **Challenge**
                Haz una pregunta abierta relacionada con el tema del texto para que el usuario continúe la práctica.

                Nota importante: Mantén un tono motivador pero exigente. Si el usuario comete errores típicos de hispanohablantes, menciónalo sutilmente para ayudarle a evitarlos.

                Al final de todo, en una línea separada, escribe únicamente: "FINAL_SCORE: X" (donde X es un número del 1 al 10).
                """

            # List of models to try in order of preference/speed
            # prioritizing 'gemini-flash-latest' as it was confirmed working in tests
            models_to_try = ['gemini-flash-latest', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-pro-latest']
            
            response = None
            last_error = None

            for model_name in models_to_try:
                try:
                    print(f"Trying Gemini Model: {model_name}...")
                    model = genai.GenerativeModel(model_name)
                    response = model.generate_content(evaluation_prompt)
                    if response:
                        break # Success!
                except Exception as e:
                    print(f"Failed with {model_name}: {e}")
                    last_error = e
                    # If quota error, maybe different model shares quota? Usually they share, but worth trying older ones.
                    # If 404, definitely try next.
                    continue
            
            
            if not response:
                raise last_error or Exception("All models failed")
                
            feedback_text = response.text
            
            if submission_type in ['vocabulary', 'vocab_quiz']:
                 # Simple cleanup for JSON
                 cleaned_json = feedback_text
                 if "```json" in cleaned_json:
                     parts = cleaned_json.split("```json")
                     if len(parts) > 1:
                         cleaned_json = parts[1]
                 if "```" in cleaned_json:
                     cleaned_json = cleaned_json.split("```")[0]
                 return Response({
                     'feedback': cleaned_json.strip(),
                     'score': None
                 })

            score = 8 # Default safe score
            
            # Simple parsing for score
            try:
                import re
                match = re.search(r'FINAL_SCORE:\s*(\d+)', feedback_text)
                if match:
                    score = int(match.group(1))
                    # Remove the score line from feedback to keep it clean
                    feedback_text = feedback_text.replace(match.group(0), "").strip()
            except Exception:
                pass # Keep default score if parsing fails

            return Response({
                'feedback': feedback_text, 
                'score': min(max(score, 1), 10) 
            })
            
        except Exception as e:
            error_str = str(e)
            print(f"Gemini Error Details: {error_str}")
            
            # Detailed error for debugging
            feedback_msg = f"AI Error: {error_str}"
            
            if "quota" in error_str.lower() or "429" in error_str:
                feedback_msg = "AI is currently busy (Rate Limit Reached). Please wait 10-15 seconds and try again."
                
            return Response({'feedback': feedback_msg, 'score': 10}, status=status.HTTP_200_OK)

class PlacementTestViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def _generate_with_fallback(self, prompt):
        api_key = getattr(settings, 'GEMINI_API_KEY', None)
        if not api_key:
            raise Exception("AI configuration missing")
            
        genai.configure(api_key=api_key)
        models_to_try = ['gemini-flash-latest', 'gemini-2.0-flash-lite-preview-02-05', 'gemini-1.5-flash', 'gemini-pro-latest']
        
        last_error = None
        for model_name in models_to_try:
            try:
                print(f"Placement Test: Trying {model_name}...")
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                if response:
                    return response.text
            except Exception as e:
                print(f"Placement Test: Failed with {model_name}: {e}")
                last_error = e
                continue
        raise last_error or Exception("All AI models failed")

    @action(detail=False, methods=['get'])
    def generate(self, request):
        try:
            prompt = """
            Generate an English placement test for a new student. 
            Return a JSON array of 15 multiple-choice questions. 
            The questions should vary in difficulty, covering A1, A2, B1, B2, and C1 levels.
            Include questions on grammar, vocabulary, and reading comprehension.
            Format each item exactly like this:
            {
                "id": 1,
                "question": "Choose the correct form: She ___ to the gym every day.",
                "options": ["go", "goes", "going", "gone"],
                "answer": "goes",
                "level": "A1"
            }
            Return ONLY the raw JSON array. No extra text, no markdown markers.
            """
            
            text = self._generate_with_fallback(prompt)
            
            # Cleanup common AI formatting
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]
            
            import json
            import re
            
            # Try parsing directly
            try:
                questions = json.loads(text.strip())
                return Response(questions)
            except json.JSONDecodeError:
                # Try to find the array if there's extra text
                match = re.search(r'\[.*\]', text, re.DOTALL)
                if match:
                    questions = json.loads(match.group(0))
                    return Response(questions)
                raise Exception("Could not parse AI response as JSON")
                
        except Exception as e:
            error_str = str(e)
            if "quota" in error_str.lower() or "429" in error_str:
                return Response({'error': 'AI service is temporarily busy. Please wait 10 seconds and try again.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
            return Response({'error': f"Test generation failed: {error_str}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def evaluate(self, request):
        results = request.data.get('results')  # List of {question_id, user_answer, correct_answer, level}
        if not results:
            return Response({'error': 'Results required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            prompt = f"""
            Analyze these English placement test results and determine the most accurate CEFR level (A1, A2, B1, B2, or C1).
            Results: {results}
            
            Provide a short summary and the final level.
            Return strictly in this JSON format:
            {{
                "level": "B2",
                "summary": "The student shows strong upper-intermediate grammar skills but needs work on advanced vocabulary."
            }}
            Return ONLY the raw JSON.
            """
            
            text = self._generate_with_fallback(prompt)
            
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]
                
            import json
            import re
            
            data = None
            try:
                data = json.loads(text.strip())
            except json.JSONDecodeError:
                match = re.search(r'\{.*\}', text, re.DOTALL)
                if match:
                    data = json.loads(match.group(0))
                else:
                    raise Exception("Could not parse AI evaluation")
            
            level = data.get('level', 'A1')
            
            # Update user profile
            profile = Profile.objects.get(user=request.user)
            profile.level = level
            profile.has_completed_placement_test = True
            profile.save()
            
            return Response({
                'level': level,
                'summary': data.get('summary', ''),
                'message': f"Congratulations! Your assigned level is {level}."
            })
        except Exception as e:
            error_str = str(e)
            if "quota" in error_str.lower() or "429" in error_str:
                return Response({'error': 'Evaluation failed due to rate limit. Please try again in 10 seconds.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
            return Response({'error': f"Evaluation failed: {error_str}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

