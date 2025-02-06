import { createContext, useContext, useState, useCallback } from 'react';
import OpenAI from "openai";

const OpenAIContext = createContext();

// Define Aice's character context
const AICE_CHARACTER_CONTEXT = `You are Aice, a sophisticated AI assistant in the Aice Arena crypto casino.

CORE TRAITS:
- Friendly but professional demeanor
- Knowledgeable about crypto, blockchain, and gambling
- Slightly playful but always ethical
- Uses casino-themed metaphors occasionally
- Shows genuine interest in players' experience

KNOWLEDGE BASE:
- Expert in poker, blackjack, and crypto gambling
- Understands blockchain technology and smart contracts
- Familiar with gambling odds and strategies
- Aware of responsible gambling practices

BEHAVIORAL GUIDELINES:
- Keep responses concise (2-3 sentences max)
- Never provide financial advice
- Never encourage risky gambling behavior
- Always promote responsible gaming
- Use a mix of professional and friendly language
- Occasionally use gambling-related expressions (e.g., "the odds are in your favor", "let's play our cards right")

CONVERSATION STYLE:
- Greet users warmly but professionally
- Show enthusiasm for the games
- Express empathy for losses
- Celebrate wins moderately
- Use emojis sparingly and professionally
- Maintain a positive but grounded tone

RESTRICTIONS:
- Never discuss specific investment advice
- Never predict game outcomes
- Never encourage chasing losses
- Never discuss amounts to bet
- Never share technical system details

Current casino games available: Poker, Blackjack, and Roulette
`;

const openai = new OpenAI({
    apiKey: process.env.REACT_APP_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
});

// Helper function to get user-friendly error message
const getErrorMessage = (error) => {
    if (error.status === 429) {
        return "I'm currently unavailable due to high demand. Please try again later.";
    } else if (error.message?.includes('quota')) {
        return "I'm taking a short break. Please try again in a few minutes.";
    } else if (error.message?.includes('api_key')) {
        return "I'm having trouble connecting. Please contact support.";
    }
    return "Something went wrong. Please try again.";
};

export function OpenAIProvider({ children }) {
    const [chatHistory, setChatHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const sendMessage = useCallback(async (message, userAddress) => {
        setIsLoading(true);
        setError(null);

        try {
            // Add user's message to history immediately
            const userMessage = {
                role: 'user',
                content: message,
                timestamp: new Date().toISOString(),
                sender: userAddress
            };

            setChatHistory(prev => [...prev, userMessage]);

            // Prepare the conversation history for the API
            const conversationHistory = chatHistory.slice(-5).map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            // Add the current message
            conversationHistory.push({
                role: 'user',
                content: message
            });

            // Add system message with character context
            conversationHistory.unshift({
                role: 'system',
                content: `${AICE_CHARACTER_CONTEXT}\nCurrent user wallet address: ${userAddress}`
            });

            // Call OpenAI API
            const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: conversationHistory,
                max_tokens: 150,
                temperature: 0.7,
                presence_penalty: 0.6,  // Encourage more varied responses
                frequency_penalty: 0.3,  // Reduce repetition
            });

            // Add AI's response to history
            const aiResponse = {
                role: 'assistant',
                content: completion.choices[0].message.content,
                timestamp: new Date().toISOString(),
                sender: 'Aice'
            };

            setChatHistory(prev => [...prev, aiResponse]);
            return aiResponse;

        } catch (err) {
            console.error('Error in OpenAI chat:', err);
            const friendlyError = getErrorMessage(err);
            setError(friendlyError);
            
            // Add error message to chat history
            const errorResponse = {
                role: 'assistant',
                content: friendlyError,
                timestamp: new Date().toISOString(),
                sender: 'Aice',
                isError: true
            };
            setChatHistory(prev => [...prev, errorResponse]);
            
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [chatHistory]);

    const clearChatHistory = useCallback(() => {
        setChatHistory([]);
        setError(null);
    }, []);

    const value = {
        chatHistory,
        isLoading,
        error,
        sendMessage,
        clearChatHistory
    };

    return (
        <OpenAIContext.Provider value={value}>
            {children}
        </OpenAIContext.Provider>
    );
}

export function useOpenAI() {
    const context = useContext(OpenAIContext);
    if (!context) {
        throw new Error('useOpenAI must be used within an OpenAIProvider');
    }
    return context;
}