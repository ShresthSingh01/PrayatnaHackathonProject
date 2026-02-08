
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY;
const HF_API_KEY = import.meta.env.VITE_HF_API_KEY;

const HF_BLIP_URL = "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large";
const HF_EMBEDDING_URL = "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2";

// Helper: Convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix (e.g., "data:image/jpeg;base64,") for Google API
            resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });
};

// Helper: Cosine Similarity
const cosineSimilarity = (vecA: number[], vecB: number[]) => {
    const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const magB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
    return magA && magB ? dotProduct / (magA * magB) : 0;
};

// 1. Photo Quality Check (Google Vision API)
export const checkPhotoQuality = async (file: File): Promise<number> => {
    if (!GOOGLE_API_KEY) {
        console.warn("Missing Google Cloud API Key. Using fallback quality check.");
        return fallbackQualityCheck(file);
    }

    try {
        const base64Image = await fileToBase64(file);
        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                requests: [
                    {
                        image: { content: base64Image },
                        features: [
                            { type: "SAFE_SEARCH_DETECTION" },
                            { type: "LABEL_DETECTION", maxResults: 10 }
                        ]
                    }
                ]
            })
        });

        if (!response.ok) throw new Error("Google Vision API check failed");

        const result = await response.json();
        const annotations = result.responses[0];

        // Safe Search Check
        const safeSearch = annotations.safeSearchAnnotation;
        const isSafe =
            safeSearch.adult === "VERY_UNLIKELY" &&
            safeSearch.violence === "VERY_UNLIKELY" &&
            safeSearch.racy === "VERY_UNLIKELY";

        if (!isSafe) return 0; // Reject unsafe images

        // Construction relevance check (simple heuristic based on labels)
        const labels = annotations.labelAnnotations?.map((l: any) => l.description.toLowerCase()) || [];
        const constructionKeywords = ["building", "construction", "architecture", "road", "tool", "worker", "machinery", "material", "wood", "metal", "concrete", "site", "project", "engineering", "infrastructure"];

        const relevantLabelCount = labels.filter((l: string) => constructionKeywords.some(k => l.includes(k))).length;

        // Score based on relevance (0.5 base + 0.1 per relevant label, capped at 1.0)
        let score = 0.5 + (relevantLabelCount * 0.1);
        return Math.min(score, 1.0);

    } catch (error) {
        console.error("Quality Check Error:", error);
        return fallbackQualityCheck(file);
    }
};

const fallbackQualityCheck = (file: File): number => {
    // Simple heuristic: reasonably large file (e.g. > 50KB) is likely "good enough" for offline/demo
    // Cap at 1.0
    return file.size > 50 * 1024 ? 0.8 : 0.4;
};

// 2. Auto Captioning (Hugging Face BLIP)
export const autoCaptionPhoto = async (file: File): Promise<string> => {
    if (!HF_API_KEY) {
        console.warn("Missing HF API Key. Using fallback caption.");
        return fallbackCaption();
    }

    try {
        // BLIP accepts raw binary body
        const response = await fetch(HF_BLIP_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_API_KEY}`,
                "Content-Type": file.type
            },
            body: file
        });

        if (!response.ok) throw new Error("HF BLIP API failed");

        const result = await response.json();
        // Result format: [{ generated_text: "..." }]
        if (Array.isArray(result) && result[0]?.generated_text) {
            return result[0].generated_text;
        }
        throw new Error("Invalid response format from HF BLIP");

    } catch (error) {
        console.error("Auto Caption Error:", error);
        return fallbackCaption();
    }
};

const fallbackCaption = (): string => {
    return `Photo uploaded on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
};

// 3. Task Similarity Matching (HF Sentence Transformers)
export const matchTaskSimilarity = async (taskName: string, caption: string): Promise<number> => {
    if (!HF_API_KEY) {
        console.warn("Missing HF API Key. Using fallback similarity.");
        return fallbackSimilarity(taskName, caption);
    }

    try {
        // Let's adjust to standard embedding request for robust API usage:
        const embeddingResponse = await fetch(HF_EMBEDDING_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                inputs: [taskName, caption]
            })
        });

        if (!embeddingResponse.ok) throw new Error("HF Embeddings API failed");

        const embeddings = await embeddingResponse.json();
        // Expecting array of 2 arrays of numbers
        if (Array.isArray(embeddings) && embeddings.length === 2 && Array.isArray(embeddings[0])) {
            return cosineSimilarity(embeddings[0], embeddings[1]);
        }

        throw new Error("Unexpected embedding format");

    } catch (error) {
        console.error("Similarity Match Error:", error);
        return fallbackSimilarity(taskName, caption);
    }
};

const fallbackSimilarity = (taskName: string, caption: string): number => {
    // Simple Jaccard Index (Word Overlap)
    const taskWords = new Set(taskName.toLowerCase().split(/\s+/));
    const captionWords = new Set(caption.toLowerCase().split(/\s+/));

    const intersection = new Set([...taskWords].filter(x => captionWords.has(x)));
    const union = new Set([...taskWords, ...captionWords]);

    return union.size > 0 ? intersection.size / union.size : 0;
};
