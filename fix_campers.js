const fs = require('fs');
const content = fs.readFileSync('e:/DataCamp/datacamp-mobile/src/api/campers.ts', 'utf8');
const validPart = content.split('export const useDeleteCamper')[0] + `export const useDeleteCamper = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { id: string, company_id: string, season: string }) => {
            const { error } = await supabase
                .from('children')
                .delete()
                .eq('id', params.id);

            if (error) throw error;
            return params;
        },
        onSuccess: (params) => {
            queryClient.invalidateQueries({ queryKey: ['campers', params.company_id, params.season] });
        },
    });
};

export const useDivisions = () => {
    return useQuery({
        queryKey: ['divisions'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('divisions')
                .select('*')
                .order('sort_order', { ascending: true });
            if (error) throw error;
            return data;
        }
    });
};
`;
fs.writeFileSync('e:/DataCamp/datacamp-mobile/src/api/campers.ts', validPart);
