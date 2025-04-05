// コンポーネントが存在するか確認
const LearningPlanPage = ({ planData }: LearningPlanProps) => {
  return (
    <div className="container py-8 mx-auto">
      <h1 className="text-3xl font-bold mb-6">{planData.title}</h1>
      <p className="text-muted-foreground mb-8">{planData.description}</p>
      
      <div className="mt-6">
        <LearningPlan planData={planData} />
      </div>
    </div>
  );
};

export default LearningPlanPage; 