import { AIService } from './AIService';

export interface ChatMessage {
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  id: string;
}

export class ChatService {
  // Store active audio element for TTS
  private static activeAudio: HTMLAudioElement | null = null;
  private static isSpeaking: boolean = false;

  // Get formatted timestamp
  static getTimestamp(): string {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Send a message to the AI
  static async sendMessage(
    messages: ChatMessage[],
    newMessage: string,
    model: string,
    isStreaming: boolean = false
  ): Promise<ChatMessage> {
    // Convert chat history to format expected by AI service
    const messagesForAI = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Add new message
    messagesForAI.push({
      role: 'user',
      content: newMessage
    });

    try {
      // Call the AI service with streaming or non-streaming mode
      if (isStreaming) {
        // This is a placeholder - in a real implementation we'd use a streaming API
        const response = await AIService.chatWithAI(messagesForAI, model);
        return {
          content: response,
          role: 'assistant',
          timestamp: this.getTimestamp(),
          id: Date.now().toString()
        };
      } else {
        const response = await AIService.chatWithAI(messagesForAI, model);
        return {
          content: response,
          role: 'assistant',
          timestamp: this.getTimestamp(),
          id: Date.now().toString()
        };
      }
    } catch (error: any) {
      throw new Error(`Chat error: ${error.message}`);
    }
  }

  // Use text-to-speech to speak the assistant's response
  static async speakResponse(text: string): Promise<void> {
    // Stop any previous TTS playback
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio = null;
    }

    try {
      this.isSpeaking = true;
      
      // Check if we should use Puter TTS
      if (window.puter && window.puter.ai && typeof window.puter.ai.txt2speech === 'function') {
        // Use correct puter.ai.txt2speech which returns an audio element
        const audio = await window.puter.ai.txt2speech(text);
        this.activeAudio = audio;
        
        // Set up event listener to know when audio finishes
        audio.onended = () => {
          this.isSpeaking = false;
          this.activeAudio = null;
        };
        
        await audio.play();
      } else {
        // Fallback to browser's SpeechSynthesis API
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.onend = () => {
            this.isSpeaking = false;
          };
          window.speechSynthesis.speak(utterance);
        } else {
          throw new Error('Text-to-speech is not supported in this browser');
        }
      }
    } catch (error) {
      console.error('Text-to-speech error:', error);
      this.isSpeaking = false;
      throw error;
    }
  }

  // Stop ongoing TTS playback
  static stopSpeaking(): void {
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio = null;
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
  }

  // Check if TTS is currently active
  static isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  // Generate an image from a prompt
  static async generateImage(prompt: string, model: string): Promise<string> {
    try {
      return await AIService.generateImage(prompt, model);
    } catch (error) {
      console.error('Image generation error:', error);
      throw error;
    }
  }
}