# OCR Recipe Module Implementation Plan

**Architecture**: Strategy Pattern with Composable Pipeline (Option 2)
**Language**: TypeScript
**Backend**: Convex
**Date**: 2026-01-15

## Overview

This plan outlines the implementation of an OCR-based recipe parsing module that extracts recipe data from images (physical books or screenshots). The architecture uses the Strategy Pattern to separate concerns into distinct, swappable components.

## Core Architecture

### Design Principles

1. **Separation of Concerns**: Split OCR extraction, parsing, and validation into independent interfaces
2. **Composability**: Allow mixing and matching different implementations
3. **Testability**: Each component can be tested in isolation
4. **Flexibility**: Swap implementations without changing calling code

### Component Diagram

```
Image Input → OCRProvider → Raw Text → RecipeParser → Recipe → RecipeValidator → Validated Recipe
```

## Type Definitions

### Core Data Structures

```typescript
// Recipe schema
interface Recipe {
  id?: string; // Convex-generated ID
  title?: string;
  directions: string[];
  ingredients: Ingredient[];
  createdAt: Date;
  source: RecipeSource;
  metadata?: RecipeMetadata;
}

interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  scaleFactor?: number; // Multiplier for scaling recipes
  notes?: string; // e.g., "finely chopped", "optional"
}

type RecipeSource =
  | { type: 'url'; url: string; title?: string }
  | { type: 'image'; imageUrl: string; originalFileName?: string };

interface RecipeMetadata {
  servings?: number;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  cuisine?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
}
```

### Strategy Interfaces

```typescript
// Stage 1: OCR Provider (extracts raw text from images)
interface OCRProvider {
  readonly name: string;
  extractText(image: ImageInput): Promise<OCRResult>;
}

interface ImageInput {
  data: Blob | File | ArrayBuffer;
  mimeType?: string;
  fileName?: string;
}

interface OCRResult {
  text: string;
  confidence?: number; // 0-1
  blocks?: TextBlock[]; // Optional structured text blocks
  metadata?: {
    processingTime?: number;
    provider?: string;
    [key: string]: unknown;
  };
}

interface TextBlock {
  text: string;
  confidence: number;
  boundingBox?: BoundingBox;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Stage 2: Recipe Parser (converts raw text to structured recipe)
interface RecipeParser {
  readonly name: string;
  parseRecipe(rawText: string, source: RecipeSource): Promise<Recipe>;
}

// Stage 3: Recipe Validator (optional quality checks)
interface RecipeValidator {
  readonly name: string;
  validate(recipe: Recipe): Promise<ValidationResult>;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
}

interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// Orchestrator: Combines all strategies
interface RecipeOCRService {
  ocrProvider: OCRProvider;
  parser: RecipeParser;
  validator?: RecipeValidator;

  parseRecipe(input: ParseRecipeInput): Promise<ParseRecipeResult>;
}

interface ParseRecipeInput {
  image: ImageInput;
  source: RecipeSource;
  options?: {
    skipValidation?: boolean;
    language?: string;
  };
}

interface ParseRecipeResult {
  recipe: Recipe;
  validation?: ValidationResult;
  debug?: {
    ocrResult?: OCRResult;
    parseTime?: number;
  };
}
```

## Implementation Phases

### Phase 1: Core Infrastructure (Foundation)

**Goal**: Set up project structure and base interfaces

**Tasks**:
1. Create module directory structure:
   ```
   /convex
     /recipeOCR
       /types
         - recipe.ts (core types)
         - ocr.ts (OCR types)
       /providers
         /ocr
           - OCRProvider.ts (interface)
         /parsers
           - RecipeParser.ts (interface)
         /validators
           - RecipeValidator.ts (interface)
       /services
         - RecipeOCRService.ts (orchestrator)
       - index.ts (exports)
   ```

2. Define all TypeScript interfaces and types
3. Set up Convex schema for Recipe storage
4. Create basic error types and error handling utilities

**Deliverables**:
- Complete type definitions
- Directory structure
- Convex schema
- Base interfaces (no implementations yet)

**Estimated Complexity**: Low

---

### Phase 2: First OCR Provider Implementation

**Goal**: Implement one working OCR provider

**Recommendation**: Start with AWS Textract or OpenAI Vision API

**Tasks**:
1. Choose initial provider (AWS Textract recommended for document OCR)
2. Implement `OCRProvider` interface:
   ```typescript
   class AWSTextractProvider implements OCRProvider {
     name = 'aws-textract';

     constructor(private config: AWSTextractConfig) {}

     async extractText(image: ImageInput): Promise<OCRResult> {
       // Implementation
     }
   }
   ```
3. Handle image preprocessing (resize, format conversion)
4. Implement error handling and retries
5. Add rate limiting if needed
6. Write unit tests

**Configuration**:
- Store API keys in Convex environment variables
- Create configuration interface for provider settings

**Deliverables**:
- Working OCR provider implementation
- Unit tests
- Configuration setup

**Estimated Complexity**: Medium

---

### Phase 3: Recipe Parser Implementation

**Goal**: Convert raw OCR text into structured Recipe objects

**Approach Options**:
- **Option A**: Rule-based parsing (regex + heuristics)
- **Option B**: LLM-based parsing (GPT-4, Claude)
- **Recommendation**: Start with Option B (more robust for varied formats)

**Tasks**:
1. Implement `RecipeParser` interface:
   ```typescript
   class LLMRecipeParser implements RecipeParser {
     name = 'llm-parser';

     constructor(private llmClient: LLMClient) {}

     async parseRecipe(rawText: string, source: RecipeSource): Promise<Recipe> {
       // Use LLM with structured output
     }
   }
   ```
2. Design prompt template for LLM parsing
3. Handle ingredient parsing with special attention to:
   - Fractional amounts (1/2 cup, 1 ½ cups)
   - Unit normalization (tbsp vs tablespoon)
   - Ingredient modifiers ("finely chopped", "to taste")
4. Parse directions into step-by-step array
5. Extract metadata (servings, times, etc.)
6. Handle edge cases (missing ingredients, unclear directions)

**Example LLM Prompt Structure**:
```
Extract recipe information from the following text and return as JSON:

{
  "title": "recipe name",
  "ingredients": [
    {"name": "flour", "amount": 2, "unit": "cups", "notes": "sifted"}
  ],
  "directions": ["step 1", "step 2"],
  "metadata": {
    "servings": 4,
    "prepTime": "10 minutes"
  }
}

Raw Text:
{rawText}
```

**Deliverables**:
- Working parser implementation
- Ingredient parsing logic
- Unit tests with various recipe formats

**Estimated Complexity**: High

---

### Phase 4: Recipe Validator

**Goal**: Ensure parsed recipes meet quality standards

**Tasks**:
1. Implement `RecipeValidator` interface:
   ```typescript
   class StandardRecipeValidator implements RecipeValidator {
     name = 'standard-validator';

     async validate(recipe: Recipe): Promise<ValidationResult> {
       // Validation logic
     }
   }
   ```
2. Validation rules:
   - At least one ingredient
   - At least one direction step
   - Valid amounts (no negative numbers)
   - Valid units (from whitelist)
   - Source is present
   - No duplicate ingredients
3. Optional warnings:
   - Missing metadata (servings, times)
   - Unusually long/short directions
   - Common spelling mistakes in ingredients

**Deliverables**:
- Validator implementation
- Comprehensive validation rules
- Unit tests

**Estimated Complexity**: Low-Medium

---

### Phase 5: Orchestration Service

**Goal**: Combine all components into a cohesive service

**Tasks**:
1. Implement `RecipeOCRService`:
   ```typescript
   class DefaultRecipeOCRService implements RecipeOCRService {
     constructor(
       public ocrProvider: OCRProvider,
       public parser: RecipeParser,
       public validator?: RecipeValidator
     ) {}

     async parseRecipe(input: ParseRecipeInput): Promise<ParseRecipeResult> {
       // 1. Extract text via OCR
       const ocrResult = await this.ocrProvider.extractText(input.image);

       // 2. Parse text into recipe
       const recipe = await this.parser.parseRecipe(ocrResult.text, input.source);

       // 3. Validate (if validator provided)
       let validation: ValidationResult | undefined;
       if (this.validator && !input.options?.skipValidation) {
         validation = await this.validator.validate(recipe);
       }

       return { recipe, validation };
     }
   }
   ```
2. Add error handling and logging
3. Implement factory function for easy instantiation
4. Add performance monitoring

**Deliverables**:
- Complete orchestration service
- Factory function
- Integration tests

**Estimated Complexity**: Low

---

### Phase 6: Convex Integration

**Goal**: Integrate with Convex backend for storage and API access

**Tasks**:
1. Create Convex mutations:
   ```typescript
   // convex/recipes.ts
   export const parseAndStoreRecipe = mutation(async (ctx, args: {
     imageId: string;
     source: RecipeSource;
   }) => {
     // 1. Get image from Convex storage
     // 2. Initialize OCR service
     // 3. Parse recipe
     // 4. Store in database
     // 5. Return recipe ID
   });
   ```
2. Create Convex queries for retrieving recipes
3. Implement image upload to Convex storage
4. Handle long-running operations (consider using Convex actions for OCR)
5. Add progress tracking for user feedback

**Convex Schema**:
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  recipes: defineTable({
    title: v.optional(v.string()),
    directions: v.array(v.string()),
    ingredients: v.array(v.object({
      name: v.string(),
      amount: v.number(),
      unit: v.string(),
      scaleFactor: v.optional(v.number()),
      notes: v.optional(v.string()),
    })),
    createdAt: v.number(), // timestamp
    source: v.union(
      v.object({ type: v.literal("url"), url: v.string(), title: v.optional(v.string()) }),
      v.object({ type: v.literal("image"), imageUrl: v.string(), originalFileName: v.optional(v.string()) })
    ),
    metadata: v.optional(v.object({
      servings: v.optional(v.number()),
      prepTime: v.optional(v.string()),
      cookTime: v.optional(v.string()),
      totalTime: v.optional(v.string()),
      cuisine: v.optional(v.string()),
      difficulty: v.optional(v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"))),
      tags: v.optional(v.array(v.string())),
    })),
  }).index("by_creation_time", ["createdAt"]),
});
```

**Deliverables**:
- Convex mutations and queries
- Image upload handling
- Database integration

**Estimated Complexity**: Medium

---

### Phase 7: Additional Providers (Iteration)

**Goal**: Add alternative OCR providers for experimentation

**Candidate Providers**:
1. **OpenAI Vision API** - Good for screenshots and modern layouts
2. **Google Cloud Vision** - Strong multi-language support
3. **Azure Computer Vision** - Good balance of features
4. **Tesseract OCR** - Free, open-source option (lower quality)

**Tasks**:
1. Implement 1-2 additional `OCRProvider` implementations
2. Create provider factory/registry:
   ```typescript
   class OCRProviderFactory {
     static create(type: 'aws' | 'openai' | 'google'): OCRProvider {
       // Factory logic
     }
   }
   ```
3. Add configuration for provider selection
4. Benchmark providers for accuracy and speed
5. Document trade-offs between providers

**Deliverables**:
- 2+ additional OCR provider implementations
- Provider factory
- Performance comparison documentation

**Estimated Complexity**: Medium (per provider)

---

## Testing Strategy

### Unit Tests
- Test each component in isolation
- Mock dependencies
- Focus on edge cases (missing data, malformed input)

### Integration Tests
- Test full pipeline: image → recipe
- Use sample recipe images (various formats)
- Verify end-to-end functionality

### Test Data
Create test dataset with:
- Physical cookbook photos (different lighting, angles)
- Website screenshots (various layouts)
- Handwritten recipes (if supporting)
- Different languages/cuisines
- Edge cases (incomplete recipes, ads/clutter)

### Quality Metrics
- OCR accuracy (text extraction correctness)
- Parsing accuracy (structured data correctness)
- Performance (time to process)
- Cost per recipe (API calls)

---

## Configuration & Deployment

### Environment Variables (Convex)
```typescript
// Required
OPENAI_API_KEY=xxx
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1

// Optional
OCR_PROVIDER=aws // Default provider
ENABLE_VALIDATION=true
MAX_IMAGE_SIZE_MB=10
```

### Provider Selection Strategy
```typescript
// Example: Select provider based on image characteristics
function selectProvider(image: ImageInput): OCRProvider {
  if (isScreenshot(image)) {
    return new OpenAIVisionProvider();
  } else {
    return new AWSTextractProvider();
  }
}
```

---

## Error Handling

### Error Types
```typescript
class OCRError extends Error {
  constructor(
    message: string,
    public code: OCRErrorCode,
    public retryable: boolean = false
  ) {
    super(message);
  }
}

enum OCRErrorCode {
  INVALID_IMAGE = 'INVALID_IMAGE',
  IMAGE_TOO_LARGE = 'IMAGE_TOO_LARGE',
  OCR_PROVIDER_ERROR = 'OCR_PROVIDER_ERROR',
  PARSING_FAILED = 'PARSING_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}
```

### Retry Logic
- Retry transient errors (network issues, rate limits)
- Max 3 retries with exponential backoff
- Log all failures for debugging

---

## Future Enhancements

### Phase 8+ (Post-MVP)
1. **Batch Processing**: Process multiple images at once
2. **Recipe Scaling**: Automatically scale ingredient amounts
3. **Unit Conversion**: Convert between metric/imperial
4. **Nutrition Analysis**: Calculate nutritional information
5. **Duplicate Detection**: Identify similar/duplicate recipes
6. **Multi-language Support**: Parse recipes in various languages
7. **Image Preprocessing**: Auto-rotate, enhance, crop images
8. **Confidence Scoring**: Flag low-confidence extractions for review
9. **User Corrections**: Learn from user edits to improve parsing
10. **Recipe Merging**: Combine multiple sources for one recipe

---

## Success Criteria

### MVP (Minimum Viable Product)
- ✅ Successfully parse 80%+ of test images
- ✅ Extract all required fields (ingredients, directions, source)
- ✅ Handle both physical book and screenshot sources
- ✅ Swap OCR providers via configuration
- ✅ Complete integration with Convex backend

### Performance Targets
- Process recipe in < 10 seconds (end-to-end)
- Cost < $0.10 per recipe (API costs)
- 90%+ accuracy on ingredients
- 85%+ accuracy on directions

---

## Open Questions

1. **Image Storage**: Where to store original images long-term? (Convex storage vs. S3)
2. **Cost Management**: How to handle API costs at scale? (caching, batching)
3. **User Feedback**: Should users be able to correct parsed recipes?
4. **Privacy**: Any PII concerns with recipe images?
5. **Offline Support**: Should we support offline OCR (Tesseract)?

---

## Resources

### Documentation
- AWS Textract: https://aws.amazon.com/textract/
- OpenAI Vision API: https://platform.openai.com/docs/guides/vision
- Convex File Storage: https://docs.convex.dev/file-storage

### Example Recipe Datasets
- RecipeNLG: https://recipenlg.cs.put.poznan.pl/
- Recipe1M+: http://pic2recipe.csail.mit.edu/

---

## Timeline Estimate

| Phase | Complexity | Estimated Time |
|-------|-----------|----------------|
| Phase 1: Infrastructure | Low | 1-2 days |
| Phase 2: First OCR Provider | Medium | 2-3 days |
| Phase 3: Recipe Parser | High | 3-5 days |
| Phase 4: Validator | Low-Medium | 1-2 days |
| Phase 5: Orchestration | Low | 1 day |
| Phase 6: Convex Integration | Medium | 2-3 days |
| **Total MVP** | | **10-16 days** |
| Phase 7: Additional Providers | Medium | 2-3 days each |

*Note: Timeline assumes dedicated work by experienced TypeScript/Convex developer*

---

## Next Steps

1. Review and approve this plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Create initial test dataset (10-20 sample images)
5. Select initial OCR provider (recommend AWS Textract)
