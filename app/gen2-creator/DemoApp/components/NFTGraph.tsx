import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { NFT, Relationship } from '../types';
import { WALLET_COLORS, RELATIONSHIP_COLORS } from '../constants';

interface NFTGraphProps {
    nfts: NFT[];
    relationships: Relationship[];
    onSelectNft: (nftId: number | null) => void;
    selectedNftId: number | null;
}

const NFTGraph: React.FC<NFTGraphProps> = ({ nfts, relationships, onSelectNft, selectedNftId }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const walletColorMap = useMemo(() => {
        const uniqueWallets: string[] = [...new Set(nfts.map(nft => nft.owner))];
        const colorMap = new Map<string, string>();
        uniqueWallets.forEach((wallet, i) => {
            colorMap.set(wallet, WALLET_COLORS[i % WALLET_COLORS.length]);
        });
        return colorMap;
    }, [nfts]);

    useEffect(() => {
        if (!svgRef.current || !containerRef.current) return;

        const { width, height } = containerRef.current.getBoundingClientRect();
        const svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', [-width / 2, -height / 2, width, height]);

        svg.selectAll("*").remove(); // Clear previous render

        const simulation = d3.forceSimulation(nfts as d3.SimulationNodeDatum[])
            .force('link', d3.forceLink(relationships).id((d: any) => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-200))
            .force('center', d3.forceCenter(0,0));

        const link = svg.append('g')
            .selectAll('line')
            .data(relationships)
            .join('line')
            .attr('stroke', d => RELATIONSHIP_COLORS[d.type] || '#999')
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 0.6);

        const node = svg.append('g')
            .selectAll('circle')
            .data(nfts)
            .join('circle')
            .attr('r', 12)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5)
            .call(drag(simulation) as any)
            .on('click', (event, d) => {
                onSelectNft(d.id === selectedNftId ? null : d.id);
                event.stopPropagation();
            });

        node.append('title').text(d => `NFT #${d.id}\nOwner: ${d.owner}`);

        const labels = svg.append("g")
            .selectAll("text")
            .data(nfts)
            .join("text")
            .text(d => d.id)
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .style('fill', '#000')
            .style('font-size', '10px')
            .style('font-weight', 'bold')
            .style('pointer-events', 'none');

        simulation.on('tick', () => {
            link
                .attr('x1', d => (d.source as any).x)
                .attr('y1', d => (d.source as any).y)
                .attr('x2', d => (d.target as any).x)
                .attr('y2', d => (d.target as any).y);

            node
                .attr('cx', d => (d as any).x)
                .attr('cy', d => (d as any).y);

            labels
                .attr('x', d => (d as any).x)
                .attr('y', d => (d as any).y);
        });

        // Dynamic coloring and opacity based on selection
        const connectedInfo = new Map<number, string>();
        if (selectedNftId) {
            relationships.forEach(r => {
                const sourceId = (r.source as any).id ?? r.source;
                const targetId = (r.target as any).id ?? r.target;
                if (sourceId === selectedNftId) connectedInfo.set(targetId, r.type);
                if (targetId === selectedNftId) connectedInfo.set(sourceId, r.type);
            });
        }
        
        node.attr('fill', d => {
            if (!selectedNftId) return walletColorMap.get(d.owner) || '#ccc';
            if (d.id === selectedNftId) return walletColorMap.get(d.owner) || '#ccc';
            
            const relType = connectedInfo.get(d.id);
            if (relType) return RELATIONSHIP_COLORS[relType] || '#999';

            return walletColorMap.get(d.owner) || '#ccc';
        })
        .attr('opacity', d => {
             if (!selectedNftId) return 1;
             return d.id === selectedNftId || connectedInfo.has(d.id) ? 1 : 0.2;
        });

        link.attr('stroke-opacity', d => {
            if (!selectedNftId) return 0.6;
            const sourceId = (d.source as any).id ?? d.source;
            const targetId = (d.target as any).id ?? d.target;
            return sourceId === selectedNftId || targetId === selectedNftId ? 0.9 : 0.1;
        });
            
        node.filter(d => d.id === selectedNftId)
            .attr('stroke', '#06b6d4') // cyan-500
            .attr('stroke-width', 4);
        
        d3.select(containerRef.current).on('click', () => onSelectNft(null));

        return () => {
            simulation.stop();
        };

    }, [nfts, relationships, onSelectNft, selectedNftId, walletColorMap]);

    const drag = (simulation: d3.Simulation<d3.SimulationNodeDatum, undefined>) => {
        function dragstarted(event: any, d: any) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event: any, d: any) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event: any, d: any) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        return d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended);
    }

    return (
        <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing">
            <svg ref={svgRef}></svg>
        </div>
    );
};

export default NFTGraph;