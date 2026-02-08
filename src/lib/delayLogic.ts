export type RiskFlag = 'RED' | 'YELLOW' | 'GREEN';

export interface AnalyzedPhoto {
    id: string;
    quality: number; // 0-1
    similarity: number; // 0-1
}

export interface Task {
    id: string;
    name: string;
}

export interface RiskResult {
    score: number; // 0-1
    flag: RiskFlag;
    reason: string;
}

const QUALITY_WEIGHT = 0.3;
const SIMILARITY_WEIGHT = 0.4;
const QUANTITY_WEIGHT = 0.3;
const TARGET_PHOTO_COUNT = 3;

export const computeRiskScore = (task: Task, photos: AnalyzedPhoto[]): RiskResult => {
    if (!photos || photos.length === 0) {
        return {
            score: 0,
            flag: 'RED',
            reason: 'No photos uploaded'
        };
    }

    // 1. Quantity Score (cap at 1.0)
    const quantityScore = Math.min(photos.length, TARGET_PHOTO_COUNT) / TARGET_PHOTO_COUNT;

    // 2. Quality Score (Average)
    const avgQuality = photos.reduce((sum, p) => sum + p.quality, 0) / photos.length;

    // 3. Similarity Score (Average)
    const avgSimilarity = photos.reduce((sum, p) => sum + p.similarity, 0) / photos.length;

    // Weighted Formula
    const score = (SIMILARITY_WEIGHT * avgSimilarity) +
        (QUALITY_WEIGHT * avgQuality) +
        (QUANTITY_WEIGHT * quantityScore);

    // Round to 2 decimals
    const finalScore = Math.round(score * 100) / 100;

    // Determine Flag
    let flag: RiskFlag;
    let reason = '';

    if (finalScore >= 0.8) {
        flag = 'GREEN';
        reason = 'On track';
    } else if (finalScore >= 0.5) {
        flag = 'YELLOW';
        // Identify primary drag
        if (quantityScore < 0.5) reason = 'Insufficient photos to verifying progress';
        else if (avgSimilarity < 0.5) reason = 'Photos do not match task description';
        else if (avgQuality < 0.5) reason = 'Photo quality is too low';
        else reason = 'Borderline validation';
    } else {
        flag = 'RED';
        if (quantityScore === 0) reason = 'No evidence provided';
        else if (avgSimilarity < 0.3) reason = 'Irrelevant photos uploaded';
        else if (avgQuality < 0.3) reason = 'Unusable photos (blur/dark)';
        else reason = 'Verification failed';
    }

    return {
        score: finalScore,
        flag,
        reason
    };
};
