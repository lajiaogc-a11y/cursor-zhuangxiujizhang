import { useState, useMemo } from 'react';
import { Plus, ChevronDown, ChevronRight, Search, ChevronsUpDown, ChevronsDownUp, Star, Package, Building2, User } from 'lucide-react';
import { Product, PriceTier, PRICE_TIER_LABELS, UNIT_LABELS, QuotationItem } from '@/types/quotation';
import { useProductCategories, ProductCategoryDB } from '@/hooks/useProductCategories';
import { useQProducts } from '@/hooks/useQProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface ProductSelectorProps {
  products: Product[];
  onSelectProduct: (product: Product, tier?: PriceTier) => void;
  currentItems?: QuotationItem[];
}

interface CategoryNode {
  category: { code: string; name_zh: string; name_en: string; id: string; parent_id?: string | null };
  children: CategoryNode[];
}

type ProductTab = 'company' | 'my';

function buildCategoryTree(categories: ProductCategoryDB[]): CategoryNode[] {
  const nodeMap = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];
  categories.forEach(cat => nodeMap.set(cat.id, { category: cat, children: [] }));
  categories.forEach(cat => {
    const node = nodeMap.get(cat.id)!;
    if (cat.parent_id && nodeMap.has(cat.parent_id)) {
      nodeMap.get(cat.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

export function QuotationProductSelector({ products, onSelectProduct, currentItems = [] }: ProductSelectorProps) {
  const { toast } = useToast();
  const { categories: dbCategories } = useProductCategories();
  const { favoriteIds, toggleFavorite } = useQProducts();
  const { user } = useAuth();
  const { t } = useI18n();
  const categoryTree = useMemo(() => buildCategoryTree(dbCategories), [dbCategories]);
  const categoryOrder = useMemo(() => dbCategories.map(c => c.code), [dbCategories]);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [favoritesExpanded, setFavoritesExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<ProductTab>('company');

  // Filter products by tab
  const tabProducts = useMemo(() => {
    if (activeTab === 'company') return products.filter(p => p.isCompanyProduct);
    return products.filter(p => !p.isCompanyProduct && p.createdBy === user?.id);
  }, [products, activeTab, user]);

  const favoriteProducts = useMemo(() =>
    tabProducts.filter(p => favoriteIds.includes(p.id)),
    [tabProducts, favoriteIds]
  );

  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    categoryOrder.forEach(cat => { grouped[cat] = []; });
    grouped['others'] = [];
    const query = searchQuery.toLowerCase().trim();
    const filtered = query
      ? tabProducts.filter(p => p.nameZh.toLowerCase().includes(query) || (p.nameEn || '').toLowerCase().includes(query))
      : tabProducts;
    filtered.forEach(p => {
      const cat = p.category || 'others';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    });
    return grouped;
  }, [tabProducts, searchQuery, categoryOrder]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const expandAll = () => setExpandedCategories(new Set(categoryOrder));
  const collapseAll = () => setExpandedCategories(new Set());

  const formatPrice = (price: number) => `RM ${price.toLocaleString('en-MY', { minimumFractionDigits: 0 })}`;

  const isProductTierInQuotation = (productId: string, tier: PriceTier) =>
    currentItems.some(item => item.productId === productId && (item.priceTier || 'normal') === tier);

  const handleSelectWithTier = (product: Product, tier: PriceTier) => {
    if (isProductTierInQuotation(product.id, tier)) {
      toast({ title: '重复项目', description: `"${product.nameZh}" 的${PRICE_TIER_LABELS[tier].zh}档位已在报价明细中`, variant: 'destructive' });
      return;
    }
    const priceByTier = tier === 'normal' ? (product.priceNormal ?? product.unitPrice) :
                        tier === 'medium' ? (product.priceMedium ?? product.unitPrice) :
                        (product.priceAdvanced ?? product.unitPrice);
    onSelectProduct({ ...product, unitPrice: priceByTier }, tier);
  };

  const getNodeProductCount = (node: CategoryNode): number => {
    const own = productsByCategory[node.category.code]?.length || 0;
    return own + node.children.reduce((sum, child) => sum + getNodeProductCount(child), 0);
  };

  const renderCategoryNode = (node: CategoryNode, depth: number = 0) => {
    const code = node.category.code;
    const categoryProducts = productsByCategory[code] || [];
    const isExpanded = expandedCategories.has(code);
    const totalCount = getNodeProductCount(node);
    if (searchQuery && totalCount === 0) return null;

    return (
      <div key={code}>
        <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(code)}>
          <CollapsibleTrigger asChild>
            <div
              className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${totalCount === 0 ? 'bg-muted/20 hover:bg-muted/30' : 'bg-secondary/30 hover:bg-secondary/50'}`}
              style={{ marginLeft: depth > 0 ? `${depth * 12}px` : undefined }}
            >
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                <span className="font-mono text-xs font-bold text-accent">{code}.</span>
                <span className={`text-sm font-medium truncate ${totalCount === 0 ? 'text-muted-foreground' : ''}`}>{node.category.name_zh}</span>
              </div>
              <Badge variant="secondary" className={`text-xs h-5 px-1.5 ${totalCount === 0 ? 'opacity-50' : ''}`}>{totalCount}</Badge>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {categoryProducts.length > 0 && (
              <div className="space-y-1 mt-1 ml-2 pl-2 border-l-2 border-border" style={{ marginLeft: depth > 0 ? `${depth * 12 + 8}px` : undefined }}>
                {categoryProducts.map(product => (
                  <ProductCard key={product.id} product={product} onSelectWithTier={tier => handleSelectWithTier(product, tier)} formatPrice={formatPrice} currentItems={currentItems} isFavorite={favoriteIds.includes(product.id)} onToggleFavorite={() => toggleFavorite.mutate(product.id)} />
                ))}
              </div>
            )}
            {node.children.length > 0 && (
              <div className="mt-1 space-y-1">
                {node.children.map(child => renderCategoryNode(child, depth + 1))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="sticky top-0 p-3 border-b border-border shrink-0 flex-none bg-card/95 backdrop-blur-sm z-30 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
              <Package className="w-3.5 h-3.5 text-accent" />
            </div>
            <h3 className="font-semibold text-sm">{t('qp.productCatalog')}</h3>
          </div>
          <div className="flex gap-0.5">
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={expandAll} className="h-7 w-7"><ChevronsUpDown className="w-3.5 h-3.5" /></Button></TooltipTrigger><TooltipContent side="bottom"><p>{t('common.expandAll') || '展开全部'}</p></TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={collapseAll} className="h-7 w-7"><ChevronsDownUp className="w-3.5 h-3.5" /></Button></TooltipTrigger><TooltipContent side="bottom"><p>{t('common.collapseAll') || '收起全部'}</p></TooltipContent></Tooltip>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-0.5 p-0.5 bg-muted/60 rounded-lg">
          <button
            onClick={() => setActiveTab('company')}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
              activeTab === 'company'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="w-3 h-3" />
            {t('qp.companyProducts')}
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
              activeTab === 'my'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="w-3 h-3" />
            {t('qp.myProducts')}
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t('qp.searchProducts')} className="pl-9 h-8 bg-secondary/50 border-0 text-sm" />
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-1 p-3">
            {/* Favorites section */}
            {favoriteProducts.length > 0 && !searchQuery && (
              <Collapsible open={favoritesExpanded} onOpenChange={setFavoritesExpanded}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-2 rounded-md cursor-pointer bg-amber-500/10 hover:bg-amber-500/20 transition-colors mb-1">
                    <div className="flex items-center gap-2">
                      {favoritesExpanded ? <ChevronDown className="w-3.5 h-3.5 text-amber-600" /> : <ChevronRight className="w-3.5 h-3.5 text-amber-600" />}
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="text-sm font-medium">{t('common.favorites') || '常用项目'}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs h-5 px-1.5">{favoriteProducts.length}</Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-1 mb-2 ml-2 pl-2 border-l-2 border-amber-300/50">
                    {favoriteProducts.map(product => (
                      <ProductCard key={`fav-${product.id}`} product={product} onSelectWithTier={tier => handleSelectWithTier(product, tier)} formatPrice={formatPrice} currentItems={currentItems} isFavorite onToggleFavorite={() => toggleFavorite.mutate(product.id)} />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {categoryTree.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                {searchQuery ? t('qp.noMatch') : t('qp.noProducts')}
              </div>
            ) : (
              categoryTree.map(node => renderCategoryNode(node))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function ProductCard({ product, onSelectWithTier, formatPrice, currentItems, isFavorite, onToggleFavorite }: {
  product: Product;
  onSelectWithTier: (tier: PriceTier) => void;
  formatPrice: (price: number) => string;
  currentItems: QuotationItem[];
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}) {
  const [tierOpen, setTierOpen] = useState(false);
  const hasTierPricing = (product.priceNormal != null && product.priceNormal > 0) ||
                          (product.priceMedium != null && product.priceMedium > 0) ||
                          (product.priceAdvanced != null && product.priceAdvanced > 0);
  const isTierUsed = (tier: PriceTier) => currentItems.some(item => item.productId === product.id && (item.priceTier || 'normal') === tier);

  const handleTierSelect = (tier: PriceTier) => { setTierOpen(false); onSelectWithTier(tier); };

  return (
    <div className="group relative p-2.5 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-secondary/20 transition-all">
       <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="font-medium text-[13px] leading-tight truncate">{product.nameZh}</p>
          </div>
          {product.nameEn && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{product.nameEn}</p>}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className="text-xs px-1.5 py-px rounded bg-secondary font-medium">{UNIT_LABELS[product.unit]?.zh || product.unit}</span>
            <span className="text-xs text-primary font-semibold">{formatPrice(product.unitPrice)}</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {onToggleFavorite && (
            <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }} className="shrink-0 p-1 rounded hover:bg-muted transition-colors">
              <Star className={cn("w-3.5 h-3.5 transition-colors", isFavorite ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30 hover:text-amber-400")} />
            </button>
          )}
          {hasTierPricing ? (
            <Popover open={tierOpen} onOpenChange={setTierOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/10 shrink-0">
                  <Plus className="w-4 h-4 text-primary" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <p className="text-xs font-semibold text-muted-foreground mb-1.5 px-1">选择档位</p>
                {(['normal', 'medium', 'advanced'] as PriceTier[]).map(tier => {
                  const price = tier === 'normal' ? (product.priceNormal ?? product.unitPrice) :
                                tier === 'medium' ? (product.priceMedium ?? product.unitPrice) :
                                (product.priceAdvanced ?? product.unitPrice);
                  const used = isTierUsed(tier);
                  return (
                    <Button key={tier} variant={used ? 'secondary' : 'ghost'} size="sm"
                      className="w-full justify-between h-8 text-xs" disabled={used}
                      onClick={() => handleTierSelect(tier)}>
                      <span>{PRICE_TIER_LABELS[tier].zh}</span>
                      <span className="font-semibold">{formatPrice(price)}</span>
                    </Button>
                  );
                })}
              </PopoverContent>
            </Popover>
          ) : (
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/10 shrink-0"
              onClick={() => onSelectWithTier('normal')}>
              <Plus className="w-4 h-4 text-primary" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
