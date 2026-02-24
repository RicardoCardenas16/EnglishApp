import json
import re
import google.generativeai as genai
from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from .models import Profile, Topic, Lesson, UserLessonProgress
from .serializers import ProfileSerializer, TopicSerializer, LessonSerializer, UserLessonProgressSerializer, UserSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        try:
            # Manual creation to handle password hashing and profile creation
            username = request.data.get('username', '').lower().strip()
            password = request.data.get('password')
            first_name = request.data.get('first_name', '')
            email = request.data.get('email', '').lower().strip()

            print(f"--- Registration Attempt: {username} ---")

            if not username or not password:
                return Response({'error': 'Username and password required'}, status=status.HTTP_400_BAD_REQUEST)

            if User.objects.filter(username=username).exists():
                return Response({'error': 'User already exists'}, status=status.HTTP_400_BAD_REQUEST)

            # Create the user
            user = User.objects.create_user(username=username, password=password, email=email, first_name=first_name)
            
            # Create user profile
            Profile.objects.create(user=user)
            
            # Generate token
            token, created = Token.objects.get_or_create(user=user)

            print(f"--- Registration SUCCESS: {username} ---")
            return Response({
                'token': token.key,
                'user_id': user.pk,
                'email': user.email,
                'username': user.username
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            error_msg = str(e)
            print(f"--- Registration ERROR: {error_msg} ---")
            return Response({'error': f"Server error during registration: {error_msg}"}, status=status.HTTP_400_BAD_REQUEST)

class CustomAuthToken(ObtainAuthToken):
    """
    Custom Login API that returns Token + User ID + Email
    Handle case-insensitive usernames for better UX.
    """
    def post(self, request, *args, **kwargs):
        try:
            # Normalize login username to lowercase
            username = request.data.get('username', '').lower().strip()
            password = request.data.get('password')
            
            # Specific check for admin if it's not lowercase in some setup
            final_username = username if username != 'admin' else 'admin'
            
            from django.contrib.auth import authenticate
            user = authenticate(username=final_username, password=password)
            
            if not user:
                return Response({'error': 'Unable to log in with provided credentials.'}, status=status.HTTP_400_BAD_REQUEST)
                
            token, created = Token.objects.get_or_create(user=user)
            
            # Ensure profile exists
            Profile.objects.get_or_create(user=user)

            return Response({
                'token': token.key,
                'user_id': user.pk,
                'email': user.email,
                'username': user.username
            })
        except Exception as e:
            return Response({'error': f"Login failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

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
                # Default WRITING prompt - In English for consistency
                evaluation_prompt = f"""
                Act as a native English teacher expert in Cambridge exam preparation (B2 or C1 level). Your goal is to correct and provide feedback on the text provided based on the task: "{prompt_context}".

                User Text:
                "{text}"

                Structure your response as follows:

                **Corrected Version**
                Present the corrected text with natural and fluid language.

                **Grammar & Vocabulary**
                Briefly explain the errors made (verb tenses, prepositions, etc.) and suggest 3 advanced level words or expressions (C1/C2) to replace common words.

                **Tone & Style**
                Evaluate if the tone is appropriate (formal/informal) and how to improve cohesion.

                **Challenge**
                Ask an open-ended question related to the topic for the user to continue practicing.

                Note: Keep a motivating but demanding tone. 

                At the very end, on a separate line, write ONLY: "FINAL_SCORE: X" (where X is a number from 1 to 10).
                """

            # List of models to try in order of preference/speed
            # prioritizing 'gemini-flash-latest' as it was confirmed working in tests
            # Updated models_to_try: Use 2026 available models based on list_models check
            models_to_try = [
                'gemini-pro-latest',   # Reliable Pro alias
                'gemini-flash-latest', # Reliable Flash alias
                'gemini-2.5-pro',      # New flagship 
                'gemini-2.0-flash',    # Faster 2.0
                'gemini-1.5-pro',      # Legacy fallback
                'gemini-1.5-flash',    # Legacy fallback
            ]
            
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
                # ROBUST JSON EXTRACTION: Use regex to find the first Array or Object block
                # Specifically targeting markdown json blocks if present
                import re
                try:
                    # Try to find content within ```json ... ``` first
                    md_match = re.search(r'```json\s*((\[|\{).*?(\]|\}))\s*```', feedback_text, re.DOTALL | re.IGNORECASE)
                    if md_match:
                        cleaned_json = md_match.group(1)
                    else:
                        # Fallback to general [ ] or { } search
                        json_match = re.search(r'(\[|\{).*?(\]|\})', feedback_text, re.DOTALL)
                        cleaned_json = json_match.group(0) if json_match else feedback_text
                    
                    # Verify it's actually valid JSON before returning
                    json.loads(cleaned_json) 
                    return Response({
                        'feedback': cleaned_json,
                        'score': None
                    })
                except Exception as json_e:
                    print(f"JSON Parsing failed: {json_e}. Raw text: {feedback_text}")
                    # If parsing fails, try one more simple strip of markdown
                    cleaned = feedback_text.replace('```json', '').replace('```', '').strip()
                    return Response({
                        'feedback': cleaned,
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
        # Prioritize Pro as requested by user
        # Use 2026 stable aliases
        models_to_try = ['gemini-pro-latest', 'gemini-flash-latest', 'gemini-2.5-pro', 'gemini-2.0-flash']
        
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
            Create 15 multiple-choice English questions (A1 to C1).
            Return ONLY a raw JSON array of objects:
            {"id": 1, "question": "...", "options": ["A", "B", "C", "D"], "answer": "correct_option", "level": "A1"}
            """
            
            text = self._generate_with_fallback(prompt)
            
            # Robust JSON extraction using regex
            import re
            json_match = re.search(r'\[.*\]|\{.*\}', text, re.DOTALL)
            if json_match:
                text = json_match.group(0)
            
            
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
            print(f"AI Test Generation Failed, using fallback: {error_str}")
            
            # HARDCODED FALLBACK QUESTIONS (to prevent blocking the user)
            fallback_questions = [
                {"id": 1, "question": "I ___ a student.", "options": ["am", "is", "are", "be"], "answer": "am", "level": "A1"},
                {"id": 2, "question": "Where ___ she live?", "options": ["do", "does", "is", "has"], "answer": "does", "level": "A1"},
                {"id": 3, "question": "Yesterday I ___ to the park.", "options": ["go", "gone", "went", "going"], "answer": "went", "level": "A2"},
                {"id": 4, "question": "She has ___ been to Paris.", "options": ["never", "ever", "yet", "already"], "answer": "never", "level": "A2"},
                {"id": 5, "question": "If it rains, I ___ stay at home.", "options": ["will", "would", "am", "was"], "answer": "will", "level": "B1"},
                {"id": 6, "question": "I'm looking forward to ___ you.", "options": ["see", "seeing", "saw", "seen"], "answer": "seeing", "level": "B1"},
                {"id": 7, "question": "The book ___ was written in 1920 is a classic.", "options": ["who", "which", "whose", "whom"], "answer": "which", "level": "B1"},
                {"id": 8, "question": "He denied ___ the money.", "options": ["to steal", "stealing", "steal", "stolen"], "answer": "stealing", "level": "B2"},
                {"id": 9, "question": "I wish I ___ more time.", "options": ["have", "had", "would have", "having"], "answer": "had", "level": "B2"},
                {"id": 10, "question": "By the time we arrived, they ___.", "options": ["left", "have left", "had left", "was leaving"], "answer": "had left", "level": "B2"},
                {"id": 11, "question": "Hardly ___ I started when it began to rain.", "options": ["did", "had", "was", "have"], "answer": "had", "level": "C1"},
                {"id": 12, "question": "I'd rather you ___ tell anyone.", "options": ["not", "didn't", "don't", "won't"], "answer": "didn't", "level": "C1"},
                {"id": 13, "question": "___ you need any help, let me know.", "options": ["Should", "If", "Would", "May"], "answer": "Should", "level": "C1"},
                {"id": 14, "question": "She is so lazy. ___ does she do any work.", "options": ["Often", "Rarely", "Never", "Ever"], "answer": "Rarely", "level": "B2"},
                {"id": 15, "question": "The ___ you work, the better you get.", "options": ["harder", "more hard", "hardest", "hard"], "answer": "harder", "level": "A2"}
            ]
            return Response(fallback_questions)

    @action(detail=False, methods=['post'])
    def evaluate(self, request):
        try:
            results = request.data.get('results')  # List of {question_id, user_answer, correct_answer, level}
            if not results:
                return Response({'error': 'Results required'}, status=status.HTTP_400_BAD_REQUEST)
                
            try:
                evaluation_prompt = f"""
                Analyze these English placement test results and determine the most accurate CEFR level (A1, A2, B1, B2, or C1).
                Results: {results}
                Return strictly in this JSON format:
                {{
                    "level": "B2",
                    "summary": "..."
                }}
                Return ONLY the raw JSON.
                """

                # FAST TRACK: Try only the fastest model for evaluation
                api_key = getattr(settings, 'GEMINI_API_KEY', None)
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-1.5-flash-8b')
                # Strict timeout via prompt instruction isn't real, but fallback will catch it
                response = model.generate_content(evaluation_prompt)
                text = response.text
                
                # Extract JSON from potential markdown
                json_match = re.search(r'\{.*\}', text, re.DOTALL)
                if json_match:
                    text = json_match.group(0)
                
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
                
                # Update user profile - Use get_or_create for safety
                profile, created = Profile.objects.get_or_create(user=request.user)
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
                print(f"AI Evaluation Failed, using logic fallback: {error_str}")
                
                # LOGIC FALLBACK: Calculate level based on correct answers
                correct_count = 0
                for res in results:
                    # Defensive check for res structure
                    if isinstance(res, dict) and res.get('user_answer') == res.get('correct_answer'):
                        correct_count += 1
                
                # Simple threshold mapping
                if correct_count >= 13: assigned_level = "C1"
                elif correct_count >= 10: assigned_level = "B2"
                elif correct_count >= 7: assigned_level = "B1"
                elif correct_count >= 4: assigned_level = "A2"
                else: assigned_level = "A1"
                
                # Update profile - Use get_or_create for safety
                profile, created = Profile.objects.get_or_create(user=request.user)
                profile.level = assigned_level
                profile.has_completed_placement_test = True
                profile.save()
                
                return Response({
                    'level': assigned_level,
                    'summary': f"Based on your score of {correct_count}/15, you have been placed in {assigned_level}.",
                    'message': f"Evaluation complete! Your level is {assigned_level}."
                })
        except Exception as global_e:
            return Response({'error': f"Critical Evaluation Error: {str(global_e)}"}, status=status.HTTP_400_BAD_REQUEST)

