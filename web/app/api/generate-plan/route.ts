import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { analyzeProductImage, analyzeTopicText, generateContentPlan } from '@/lib/openrouter'
import { fetchAndSaveTrendKeywords } from '@/lib/serpapi'
import { fetchAndSavePainPoints } from '@/lib/ecommerce-insights'
import { fetchAndSaveCompetitorAngles } from '@/lib/competitor'
import { getOptimalPostTime } from '@/lib/posting-schedule'
import { createContentPlanSpreadsheet } from '@/lib/google-api'


export const maxDuration = 60

const STOPWORDS = new Set(['ide', 'konten', 'review', 'cara', 'tips', 'tutorial', 'tentang', 'untuk', 'dengan', 'dari'])

function extractTrendTerm(text: string): string {
  const words = text.toLowerCase().trim().split(/[\s,.\-/]+/)
  const meaningful = words.filter(w => w.length > 2 && !STOPWORDS.has(w))
  return meaningful.slice(0, 2).join(' ') || words[0] || text.slice(0, 30)
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 })
    }

    const formData = await request.formData()
    const mode = (formData.get('mode') as string) || 'photo'
    const photo = formData.get('photo') as File | null
    const description = (formData.get('description') as string) || ''
    const topic = (formData.get('topic') as string) || ''
    const targetMarket = (formData.get('target_market') as string) || ''
    const duration = parseInt(formData.get('duration') as string ?? '7') as 7 | 30

    if (mode === 'photo' && !photo) {
      return NextResponse.json({ error: 'Foto produk diperlukan' }, { status: 400 })
    }
    if (mode === 'text' && !topic.trim()) {
      return NextResponse.json({ error: 'Topik konten diperlukan' }, { status: 400 })
    }

    const service = createServiceClient()

    let analysis: { name: string; selling_points: string[]; target_market: string; use_cases: string[] }
    let publicUrl = ''

    if (mode === 'text') {
      // Text mode — skip image upload and vision AI
      analysis = await analyzeTopicText(topic, targetMarket || undefined)
    } else {
      // Photo mode — upload image then analyze with vision AI
      try {
        const ext = photo!.name.split('.').pop() ?? 'jpg'
        const fileName = `${user.id}/${Date.now()}.${ext}`
        const bytes = await photo!.arrayBuffer()
        const { data: uploadData, error: uploadError } = await service.storage
          .from('product-images')
          .upload(fileName, bytes, { contentType: photo!.type, upsert: false })

        if (uploadError) {
          console.error('Storage upload error:', uploadError)
        } else {
          const { data: { publicUrl: url } } = service.storage
            .from('product-images')
            .getPublicUrl(uploadData.path)
          publicUrl = url
        }
      } catch (storageErr) {
        console.error('Storage error (continuing without):', storageErr)
      }

      analysis = await analyzeProductImage(publicUrl || '', description || undefined)
    }

    // Save product to DB
    const { data: product, error: productError } = await service
      .from('products')
      .insert({
        user_id: user.id,
        name: analysis.name,
        description: description || null,
        image_url: publicUrl || null,
        selling_points: analysis.selling_points,
        target_market: analysis.target_market,
      })
      .select('id, name')
      .single()

    if (productError || !product) {
      console.error('Product insert error:', productError)
      return NextResponse.json({ error: 'Gagal simpan produk: ' + (productError?.message ?? 'unknown') }, { status: 500 })
    }

    // Fetch Google Trends keywords — extract a short, generic search term
    await fetchAndSaveTrendKeywords(product.id, extractTrendTerm(mode === 'text' ? topic : analysis.name))

    // Fetch pain points and competitor angles in parallel
    const [painPoints, competitorAngles] = await Promise.all([
      fetchAndSavePainPoints(product.id, analysis.name),
      fetchAndSaveCompetitorAngles(product.id, analysis.name),
    ])

    // Fetch trending keywords (if any)
    const { data: keywords } = await service
      .from('keywords')
      .select('keyword')
      .eq('product_id', product.id)
      .order('trend_score', { ascending: false })
      .limit(8)

    const startDate = new Date().toISOString().split('T')[0]

    // Generate content plan
    const planItems = await generateContentPlan({
      productName: analysis.name,
      sellingPoints: analysis.selling_points,
      targetMarket: analysis.target_market,
      keywords: keywords?.map(k => k.keyword) ?? [],
      painPoints,
      competitorAngles,
      durationDays: duration,
      startDate,
    })

    // Create Google Spreadsheet
    let spreadsheetUrl = ''
    try {
      spreadsheetUrl = await createContentPlanSpreadsheet({
        title: `MR. PLANNER - ${analysis.name} - ${duration} hari - ${new Date().toISOString().slice(0, 10)}`,
        items: planItems.map(item => ({
          row_number: item.row_number,
          post_date: item.post_date,
          post_time: item.post_time ?? getOptimalPostTime(item.content_type, item.post_date),
          product_name: analysis.name,
          title: item.title,
          content_type: item.content_type,
          post_type: item.post_type,
          hook: item.hook,
          caption: item.caption,
          hashtags: item.hashtags ?? [],
        })),
      })
    } catch (sheetErr) {
      console.error('Google Sheets create error:', sheetErr)
    }

    // Save plan to DB
    const { data: plan, error: planError } = await service
      .from('content_plans')
      .insert({
        user_id: user.id,
        product_id: product.id,
        duration_days: duration,
        spreadsheet_url: spreadsheetUrl || null,
        status: spreadsheetUrl ? 'done' : 'pending',
      })
      .select('id')
      .single()

    if (planError) {
      console.error('Plan insert error:', planError)
      return NextResponse.json({ error: 'Gagal simpan plan: ' + planError.message }, { status: 500 })
    }

    if (plan) {
      await service.from('content_items').insert(
        planItems.map(item => ({
          plan_id: plan.id,
          row_number: item.row_number,
          post_date: item.post_date,
          post_time: item.post_time ?? getOptimalPostTime(item.content_type, item.post_date),
          product_name: analysis.name,
          title: item.title,
          content_type: item.content_type,
          post_type: item.post_type,
          hook: item.hook,
          caption: item.caption,
          hashtags: item.hashtags,
          status: 'pending' as const,
        }))
      )

      await service.from('activity_logs').insert({
        user_id: user.id,
        action: 'generate_content_plan',
        metadata: { plan_id: plan.id, product_name: analysis.name, duration_days: duration },
      })
    }

    return NextResponse.json({
      spreadsheetUrl,

      itemCount: planItems.length,
      productName: analysis.name,
    })

  } catch (err) {
    console.error('generate-plan unhandled error:', err)
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan server'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
